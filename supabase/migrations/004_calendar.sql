-- Google OAuth tokens (one per user, stores refresh token)
CREATE TABLE public.google_calendar_tokens (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  google_email  TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  access_token  TEXT,
  token_expiry  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

CREATE INDEX idx_gct_user_id ON public.google_calendar_tokens(user_id);

ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own tokens
CREATE POLICY "Users own their calendar tokens"
  ON public.google_calendar_tokens FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER on_google_calendar_tokens_updated
  BEFORE UPDATE ON public.google_calendar_tokens
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Per-user calendar selections (which Google calendars to show + which are work calendars)
CREATE TABLE public.google_calendar_selections (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  calendar_id         TEXT NOT NULL,
  calendar_name       TEXT NOT NULL,
  show_in_family_view BOOLEAN DEFAULT true NOT NULL,
  is_work_calendar    BOOLEAN DEFAULT false NOT NULL,
  color               TEXT,
  created_at          TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, calendar_id)
);

CREATE INDEX idx_gcs_user_id ON public.google_calendar_selections(user_id);

ALTER TABLE public.google_calendar_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their calendar selections"
  ON public.google_calendar_selections FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Family events stored in the app (separate from Google Calendar)
CREATE TABLE public.family_events (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title          TEXT NOT NULL,
  description    TEXT,
  start_at       TIMESTAMPTZ NOT NULL,
  end_at         TIMESTAMPTZ NOT NULL,
  all_day        BOOLEAN DEFAULT false NOT NULL,
  created_by     UUID REFERENCES auth.users(id) NOT NULL,
  gcal_event_ids JSONB DEFAULT '{}' NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at     TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_family_events_start_at ON public.family_events(start_at);
CREATE INDEX idx_family_events_created_by ON public.family_events(created_by);

ALTER TABLE public.family_events ENABLE ROW LEVEL SECURITY;

-- All household members can view/create/update/delete family events
CREATE POLICY "Family events are viewable by authenticated users"
  ON public.family_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create family events"
  ON public.family_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update family events"
  ON public.family_events FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete family events"
  ON public.family_events FOR DELETE
  TO authenticated
  USING (true);

CREATE TRIGGER on_family_events_updated
  BEFORE UPDATE ON public.family_events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
