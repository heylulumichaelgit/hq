-- Add 'Lulu' to the assigned_to enum
ALTER TYPE public.assigned_to ADD VALUE IF NOT EXISTS 'Lulu';

-- Add parent_id column for subtasks (max 1 level nesting)
ALTER TABLE public.todos
  ADD COLUMN parent_id UUID REFERENCES public.todos(id) ON DELETE CASCADE;

-- Add section column for grouping todos
ALTER TABLE public.todos
  ADD COLUMN section TEXT;

-- Add position column for ordering within sections
ALTER TABLE public.todos
  ADD COLUMN position INTEGER DEFAULT 0;

-- Index for efficient subtask queries
CREATE INDEX idx_todos_parent_id ON public.todos(parent_id);

-- Index for section grouping
CREATE INDEX idx_todos_section ON public.todos(section);

-- Constraint: subtasks cannot have subtasks (max 1 level nesting)
-- A todo with a parent_id cannot itself be a parent
CREATE OR REPLACE FUNCTION public.check_subtask_depth()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    -- Check that the parent is not itself a subtask
    IF EXISTS (SELECT 1 FROM public.todos WHERE id = NEW.parent_id AND parent_id IS NOT NULL) THEN
      RAISE EXCEPTION 'Cannot create sub-subtasks. Maximum nesting depth is 1 level.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_subtask_depth
  BEFORE INSERT OR UPDATE ON public.todos
  FOR EACH ROW
  WHEN (NEW.parent_id IS NOT NULL)
  EXECUTE FUNCTION public.check_subtask_depth();
