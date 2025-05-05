-- Disable RLS for comments table temporarily for development
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;

-- If you want to re-enable it later with a permissive policy:
-- CREATE POLICY "Anyone can create comments" ON comments
--   FOR ALL
--   USING (true)
--   WITH CHECK (true);

-- Alternatively, you can create a policy that allows only authenticated users:
-- CREATE POLICY "Authenticated users can create comments" ON comments
--   FOR ALL
--   USING (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id);
