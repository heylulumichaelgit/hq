CREATE TABLE public.holidays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  destination TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'booked', 'completed', 'cancelled')),
  notes TEXT,
  budget NUMERIC(10,2),
  currency TEXT DEFAULT 'EUR',
  attendees TEXT,
  booking_ref TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX idx_holidays_status ON public.holidays(status);
CREATE INDEX idx_holidays_start_date ON public.holidays(start_date);
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Holidays viewable by authenticated users" ON public.holidays FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert holidays" ON public.holidays FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update holidays" ON public.holidays FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete holidays" ON public.holidays FOR DELETE TO authenticated USING (true);
