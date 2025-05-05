-- Create function to get all users (only callable by superusers)
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  confirmed_at TIMESTAMPTZ,
  is_superuser BOOLEAN
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the calling user is a superuser
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND raw_user_meta_data->>'is_superuser' = 'true'
  ) THEN
    RAISE EXCEPTION 'Access denied: Only superusers can call this function';
  END IF;

  -- Return all users with their superuser status
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.confirmed_at,
    (u.raw_user_meta_data->>'is_superuser')::BOOLEAN AS is_superuser
  FROM auth.users u
  ORDER BY u.email;
END;
$$;

-- Create function to promote a user to superuser (only callable by existing superusers)
CREATE OR REPLACE FUNCTION promote_to_superuser(user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_meta JSONB;
BEGIN
  -- Check if the calling user is a superuser
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND raw_user_meta_data->>'is_superuser' = 'true'
  ) THEN
    RAISE EXCEPTION 'Access denied: Only superusers can call this function';
  END IF;

  -- Get the user's current metadata
  SELECT raw_user_meta_data INTO user_meta
  FROM auth.users
  WHERE id = user_id;

  -- Update the user's metadata to include superuser status
  user_meta := COALESCE(user_meta, '{}'::JSONB) || '{"is_superuser": "true"}'::JSONB;

  -- Update the user
  UPDATE auth.users
  SET raw_user_meta_data = user_meta
  WHERE id = user_id;

  RETURN TRUE;
END;
$$;

-- Create a function to check if a user is a superuser
CREATE OR REPLACE FUNCTION is_superuser()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND raw_user_meta_data->>'is_superuser' = 'true'
  );
END;
$$;
