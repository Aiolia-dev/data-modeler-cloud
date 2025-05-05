-- Create a function to directly set a user as a superuser (only callable by existing superusers)
CREATE OR REPLACE FUNCTION admin_set_superuser(target_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_meta JSONB;
BEGIN
  -- Get the user's current metadata
  SELECT raw_user_meta_data INTO user_meta
  FROM auth.users
  WHERE id = target_user_id;

  -- Update the user's metadata to include superuser status
  user_meta := COALESCE(user_meta, '{}'::JSONB) || '{"is_superuser": "true"}'::JSONB;

  -- Update the user
  UPDATE auth.users
  SET raw_user_meta_data = user_meta
  WHERE id = target_user_id;

  RETURN TRUE;
END;
$$;

-- Create a simpler version of the is_superuser function that doesn't check auth.uid()
CREATE OR REPLACE FUNCTION direct_is_superuser(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = user_id AND raw_user_meta_data->>'is_superuser' = 'true'
  );
END;
$$;
