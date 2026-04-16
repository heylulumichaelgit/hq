-- Create custom types
CREATE TYPE public.priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.assigned_to AS ENUM ('Andrew', 'Chrystalla', 'Both');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create todos table
CREATE TABLE public.todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  priority public.priority DEFAULT 'medium' NOT NULL,
  assigned_to public.assigned_to DEFAULT 'Both' NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  is_completed BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX idx_todos_assigned_to ON public.todos(assigned_to);
CREATE INDEX idx_todos_priority ON public.todos(priority);
CREATE INDEX idx_todos_is_completed ON public.todos(is_completed);
CREATE INDEX idx_todos_due_date ON public.todos(due_date);
CREATE INDEX idx_todos_created_by ON public.todos(created_by);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- Profiles policies: authenticated users can read all profiles
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Profiles: users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Todos policies: all authenticated users can view all todos (shared family list)
CREATE POLICY "Todos are viewable by authenticated users"
  ON public.todos FOR SELECT
  TO authenticated
  USING (true);

-- Todos: authenticated users can create todos
CREATE POLICY "Authenticated users can create todos"
  ON public.todos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Todos: authenticated users can update any todo (shared list)
CREATE POLICY "Authenticated users can update todos"
  ON public.todos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Todos: authenticated users can delete any todo (shared list)
CREATE POLICY "Authenticated users can delete todos"
  ON public.todos FOR DELETE
  TO authenticated
  USING (true);

-- Enable realtime for todos
ALTER PUBLICATION supabase_realtime ADD TABLE public.todos;

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_todo_updated
  BEFORE UPDATE ON public.todos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
