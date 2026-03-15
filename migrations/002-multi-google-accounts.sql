-- Migration 002: Allow multiple Google accounts per user
-- Fixes: connecting a second Google account was silently overwriting the first.

-- 1. Drop the single-account unique constraint on user_id
ALTER TABLE google_calendar_tokens
  DROP CONSTRAINT IF EXISTS google_calendar_tokens_user_id_key;

-- 2. Add a composite unique constraint: one row per (user, google account)
ALTER TABLE google_calendar_tokens
  ADD CONSTRAINT google_calendar_tokens_user_id_google_email_key
  UNIQUE (user_id, google_email);

-- 3. Track which Google account each calendar selection belongs to
--    so we can cleanly remove its calendars when that account is disconnected.
ALTER TABLE google_calendar_selections
  ADD COLUMN IF NOT EXISTS google_email text;
