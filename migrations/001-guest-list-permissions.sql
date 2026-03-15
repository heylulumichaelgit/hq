-- Enable RLS on todos table (if not already)
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Create or replace policy for household members
DROP POLICY IF EXISTS "allow_household_read_write" ON todos;
CREATE POLICY "allow_household_read_write" 
ON todos 
FOR ALL 
USING (auth.uid() IN (
  SELECT id FROM profiles WHERE name = 'Andrew' OR name = 'Chrystalla' OR name = 'Lulu'
))
WITH CHECK (auth.uid() IN (
  SELECT id FROM profiles WHERE name = 'Andrew' OR name = 'Chrystalla' OR name = 'Lulu'
));

-- Alternatively, if you want to grant Andrew full access:
-- Create a role for app admin
CREATE ROLE "hq_app_admin" NOLOGIN;
GRANT SELECT, INSERT, UPDATE, DELETE ON todos TO "hq_app_admin";

-- Grant Andrew's role membership (requires Andrew's role ID)
-- This would need to be done in Supabase dashboard or via:
-- ALTER ROLE "<Andrew_role_id>" SET SESSION REPLICATIONOrigin = 'off';
-- GRANT "hq_app_admin" TO "<Andrew_role_id>";

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON todos;
DROP POLICY IF EXISTS "Enable read access for all users" ON todos;

-- Recreate with proper household policy
CREATE POLICY "Enable full access for household members" 
ON todos 
FOR ALL 
USING (
  auth.uid() = ANY(ARRAY(
    (SELECT id FROM profiles WHERE name IN ('Andrew', 'Chrystalla', 'Lulu'))::uuid[]
  ))
);

-- Grant insert/update/delete on events table for household
DROP POLICY IF EXISTS "household_events_policy" ON events;
CREATE POLICY "household_events_policy" 
ON events 
FOR ALL 
USING (auth.uid() IN (SELECT id FROM profiles WHERE name IN ('Andrew', 'Chrystalla', 'Lulu')))
WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE name IN ('Andrew', 'Chrystalla', 'Lulu')));
