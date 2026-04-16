-- Add recurrence support to todos
ALTER TABLE public.todos
  ADD COLUMN recurrence_rule TEXT;

-- Index for finding recurring todos efficiently
CREATE INDEX idx_todos_recurrence ON public.todos(recurrence_rule) WHERE recurrence_rule IS NOT NULL;
