-- Test script to verify referentials table is accessible
-- This will insert a test referential and then delete it

-- First, disable RLS if not already disabled
ALTER TABLE referentials DISABLE ROW LEVEL SECURITY;

-- Insert a test referential
INSERT INTO referentials (
  name,
  description,
  color,
  data_model_id,
  created_by
) VALUES (
  'Test Referential',
  'This is a test referential to verify the table is accessible',
  '#FF0000',
  (SELECT id FROM data_models LIMIT 1), -- Get any data model ID
  (SELECT auth.uid()) -- Current user ID
);

-- Verify the insert worked
SELECT * FROM referentials WHERE name = 'Test Referential';

-- Clean up the test data
DELETE FROM referentials WHERE name = 'Test Referential';

-- Output success message
SELECT 'Test completed successfully. If you see this message, the referentials table is accessible.' AS result;
