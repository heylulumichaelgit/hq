CREATE TABLE public.service_partners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  phone TEXT,
  email TEXT,
  website TEXT,
  address TEXT,
  notes TEXT,
  is_favourite BOOLEAN DEFAULT false NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_service_partners_category ON public.service_partners(category);
CREATE INDEX idx_service_partners_is_favourite ON public.service_partners(is_favourite);
ALTER TABLE public.service_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service partners viewable by authenticated users" ON public.service_partners FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert service partners" ON public.service_partners FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update service partners" ON public.service_partners FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete service partners" ON public.service_partners FOR DELETE TO authenticated USING (true);
