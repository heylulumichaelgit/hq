-- Add Supabase Storage backup columns to expenses table
-- storage_path: the path within the 'receipts' bucket (e.g. 2026/03/receipts/1234-file.jpg)
-- storage_url: the public URL for the file in Supabase Storage

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS storage_url TEXT;

-- NOTE: You must manually create a 'receipts' Storage bucket in Supabase Dashboard:
--   1. Go to Storage in the Supabase Dashboard
--   2. Create a new bucket called 'receipts'
--   3. Set it to Public (for public read access)
--   4. Under Policies, add a policy allowing authenticated users to upload (INSERT)
--      e.g. Policy name: "Authenticated users can upload receipts"
--          Allowed operation: INSERT
--          Target roles: authenticated
--          WITH CHECK: true
