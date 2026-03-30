-- Add expense_type column to distinguish personal vs company expenses
ALTER TABLE public.expenses
  ADD COLUMN expense_type TEXT NOT NULL DEFAULT 'personal'
  CHECK (expense_type IN ('personal', 'company'));
