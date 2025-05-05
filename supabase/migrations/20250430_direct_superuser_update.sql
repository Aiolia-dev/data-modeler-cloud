-- Direct update of user metadata to set superuser status
-- This is a more direct approach that doesn't rely on RPC functions

-- First, let's create a view to help us see user metadata (for debugging)
CREATE OR REPLACE VIEW user_metadata_view AS
SELECT 
  id,
  email,
  raw_user_meta_data
FROM auth.users;

-- Now, let's create a function that can be run directly in SQL
CREATE OR REPLACE FUNCTION set_user_as_superuser(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
  user_meta JSONB;
BEGIN
  -- Find the user by email
  SELECT id, raw_user_meta_data INTO target_user_id, user_meta
  FROM auth.users
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Update the user's metadata to include superuser status
  user_meta := COALESCE(user_meta, '{}'::JSONB) || '{"is_superuser": "true"}'::JSONB;
  
  -- Update the user
  UPDATE auth.users
  SET raw_user_meta_data = user_meta
  WHERE id = target_user_id;
  
  RETURN TRUE;
END;
$$;

-- Example usage (uncomment and replace with your email to run):
-- SELECT set_user_as_superuser('your.email@example.com');
