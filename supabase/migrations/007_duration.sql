ALTER TABLE public.todos ADD COLUMN duration_minutes INTEGER;
CREATE INDEX idx_todos_duration ON public.todos(duration_minutes) WHERE duration_minutes IS NOT NULL;
