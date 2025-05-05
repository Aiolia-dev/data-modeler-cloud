-- Check if RLS is enabled on data_models table
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'data_models';

-- List RLS policies on data_models table
SELECT * FROM pg_policies WHERE tablename = 'data_models';

-- Temporarily disable RLS on data_models table for testing
-- ALTER TABLE data_models DISABLE ROW LEVEL SECURITY;

-- Try to access the specific data model directly
SELECT * FROM data_models WHERE id = 'bc325bbb-e219-4676-9fc6-8bb6894c0ca7';
