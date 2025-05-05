-- Create a simpler function to directly set the current user as a superuser
CREATE OR REPLACE FUNCTION direct_set_superuser()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  user_meta JSONB;
BEGIN
  -- Get the current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'No authenticated user found';
  END IF;
  
  -- Get the user's current metadata
  SELECT raw_user_meta_data INTO user_meta
  FROM auth.users
  WHERE id = current_user_id;
  
  -- Update the user's metadata to include superuser status
  user_meta := COALESCE(user_meta, '{}'::JSONB) || '{"is_superuser": "true"}'::JSONB;
  
  -- Update the user
  UPDATE auth.users
  SET raw_user_meta_data = user_meta
  WHERE id = current_user_id;
  
  RETURN TRUE;
END;
$$;
