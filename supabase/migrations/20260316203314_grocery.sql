-- Grocery items table
CREATE TABLE public.grocery_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  quantity NUMERIC,
  unit TEXT,
  is_checked BOOLEAN DEFAULT false NOT NULL,
  added_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  position INTEGER DEFAULT 0 NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_grocery_items_is_checked ON public.grocery_items(is_checked);
CREATE INDEX idx_grocery_items_category ON public.grocery_items(category);
CREATE INDEX idx_grocery_items_position ON public.grocery_items(position);

-- Enable RLS
ALTER TABLE public.grocery_items ENABLE ROW LEVEL SECURITY;

-- All authenticated users (family) can read all items
CREATE POLICY "Grocery items viewable by authenticated users"
  ON public.grocery_items FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert
CREATE POLICY "Authenticated users can add grocery items"
  ON public.grocery_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update any item (shared list)
CREATE POLICY "Authenticated users can update grocery items"
  ON public.grocery_items FOR UPDATE
  TO authenticated
  USING (true);

-- Authenticated users can delete any item
CREATE POLICY "Authenticated users can delete grocery items"
  ON public.grocery_items FOR DELETE
  TO authenticated
  USING (true);
