CREATE TABLE public.meal_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start DATE NOT NULL,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  meal_type TEXT NOT NULL DEFAULT 'dinner' CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
  title TEXT NOT NULL,
  notes TEXT,
  recipe_url TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(week_start, day_of_week, meal_type)
);
CREATE INDEX idx_meal_plans_week_start ON public.meal_plans(week_start);
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Meal plans viewable by authenticated users" ON public.meal_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert meal plans" ON public.meal_plans FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update meal plans" ON public.meal_plans FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete meal plans" ON public.meal_plans FOR DELETE TO authenticated USING (true);
