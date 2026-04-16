-- Idempotency log for the daily-reminder cron. A single row per run date
-- prevents duplicate pushes if the cron is retried by Vercel or invoked twice.
CREATE TABLE public.daily_reminder_runs (
  run_date    DATE PRIMARY KEY,
  started_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.daily_reminder_runs ENABLE ROW LEVEL SECURITY;
-- No policies: only the service-role client (used by the cron) may access this table.
