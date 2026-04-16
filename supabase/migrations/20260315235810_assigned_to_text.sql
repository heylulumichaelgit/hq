-- Convert assigned_to from enum to TEXT to support multiple assignees (comma-separated)
-- First add a temp TEXT column
ALTER TABLE public.todos ADD COLUMN assigned_to_text TEXT;

-- Copy existing values, converting 'Both' -> 'Andrew,Chrystalla'
UPDATE public.todos
SET assigned_to_text = CASE
  WHEN assigned_to::text = 'Both' THEN 'Andrew,Chrystalla'
  ELSE assigned_to::text
END;

-- Drop the old enum column and index
DROP INDEX IF EXISTS idx_todos_assigned_to;
ALTER TABLE public.todos DROP COLUMN assigned_to;

-- Rename the new text column
ALTER TABLE public.todos RENAME COLUMN assigned_to_text TO assigned_to;

-- Add NOT NULL constraint and default
ALTER TABLE public.todos ALTER COLUMN assigned_to SET NOT NULL;
ALTER TABLE public.todos ALTER COLUMN assigned_to SET DEFAULT 'Andrew,Chrystalla';

-- Drop the old enum type
DROP TYPE IF EXISTS public.assigned_to;

-- Recreate index on the text column
CREATE INDEX idx_todos_assigned_to ON public.todos(assigned_to);
