CREATE TABLE public.grocery_staples (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  quantity NUMERIC,
  unit TEXT,
  notes TEXT,
  added_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (lower(name), coalesce(unit, ''), coalesce(notes, ''))
);

CREATE INDEX idx_grocery_staples_category ON public.grocery_staples(category);
CREATE INDEX idx_grocery_staples_name ON public.grocery_staples(name);

ALTER TABLE public.grocery_staples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Grocery staples viewable by authenticated users"
  ON public.grocery_staples FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can add grocery staples"
  ON public.grocery_staples FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update grocery staples"
  ON public.grocery_staples FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete grocery staples"
  ON public.grocery_staples FOR DELETE
  TO authenticated
  USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.grocery_staples;

CREATE TRIGGER on_grocery_staples_updated
  BEFORE UPDATE ON public.grocery_staples
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
