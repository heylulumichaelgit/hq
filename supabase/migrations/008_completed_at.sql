ALTER TABLE public.todos ADD COLUMN completed_at TIMESTAMPTZ;

-- Backfill: set completed_at = updated_at for already-completed todos
UPDATE public.todos SET completed_at = updated_at WHERE is_completed = true;

-- Trigger: auto-set completed_at when is_completed flips true, clear when flipped false
CREATE OR REPLACE FUNCTION public.handle_todo_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_completed = true AND (OLD.is_completed = false OR OLD.is_completed IS NULL) THEN
    NEW.completed_at := now();
  ELSIF NEW.is_completed = false THEN
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_todo_completed
  BEFORE UPDATE ON public.todos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_todo_completed();
