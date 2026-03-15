-- Labels table
CREATE TABLE public.labels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Seed default family labels
INSERT INTO public.labels (name, color) VALUES
  ('urgent',    '#ef4444'),
  ('waiting',   '#f59e0b'),
  ('groceries', '#22c55e'),
  ('school',    '#3b82f6'),
  ('bills',     '#a855f7');

-- Junction table: todos ↔ labels
CREATE TABLE public.todo_labels (
  todo_id  UUID REFERENCES public.todos(id)  ON DELETE CASCADE NOT NULL,
  label_id UUID REFERENCES public.labels(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (todo_id, label_id)
);

CREATE INDEX idx_todo_labels_todo_id  ON public.todo_labels(todo_id);
CREATE INDEX idx_todo_labels_label_id ON public.todo_labels(label_id);

-- Comments table
CREATE TABLE public.todo_comments (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id    UUID REFERENCES public.todos(id)    ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_todo_comments_todo_id ON public.todo_comments(todo_id);

-- RLS: labels
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Labels viewable by authenticated users" ON public.labels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create labels"  ON public.labels FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update labels"  ON public.labels FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete labels"  ON public.labels FOR DELETE TO authenticated USING (true);

-- RLS: todo_labels
ALTER TABLE public.todo_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todo labels viewable by authenticated users" ON public.todo_labels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage todo labels"  ON public.todo_labels FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can remove todo labels"  ON public.todo_labels FOR DELETE TO authenticated USING (true);

-- RLS: comments
ALTER TABLE public.todo_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments viewable by authenticated users"    ON public.todo_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create comments"     ON public.todo_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Authenticated users can delete own comments" ON public.todo_comments FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.todo_comments;
