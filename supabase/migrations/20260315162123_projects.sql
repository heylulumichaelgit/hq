-- Create projects table
CREATE TABLE public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1' NOT NULL,
  position INTEGER DEFAULT 0 NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_projects_position ON public.projects(position);
CREATE INDEX idx_projects_created_by ON public.projects(created_by);

-- Add project_id to todos (nullable = Inbox)
ALTER TABLE public.todos
  ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX idx_todos_project_id ON public.todos(project_id);

-- RLS for projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Projects are viewable by authenticated users"
  ON public.projects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create projects"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update projects"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete projects"
  ON public.projects FOR DELETE
  TO authenticated
  USING (true);

CREATE TRIGGER on_project_updated
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;

-- Increase subtask nesting depth from 1 → 3 levels
CREATE OR REPLACE FUNCTION public.check_subtask_depth()
RETURNS TRIGGER AS $$
DECLARE
  depth INT := 0;
  current_id UUID := NEW.parent_id;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    WHILE current_id IS NOT NULL LOOP
      depth := depth + 1;
      IF depth >= 3 THEN
        RAISE EXCEPTION 'Maximum subtask nesting depth is 3 levels.';
      END IF;
      SELECT parent_id INTO current_id FROM public.todos WHERE id = current_id;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
