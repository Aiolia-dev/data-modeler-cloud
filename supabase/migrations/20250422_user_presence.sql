-- Create set_user_offline function to update user presence status
CREATE OR REPLACE FUNCTION set_user_offline(p_user_id uuid, p_project_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE user_presence
  SET is_online = false
  WHERE user_id = p_user_id AND project_id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create set_user_presence function to upsert presence records
CREATE OR REPLACE FUNCTION set_user_presence(p_user_id uuid, p_project_id uuid, p_last_seen_at timestamptz)
RETURNS void AS $$
BEGIN
  INSERT INTO user_presence (user_id, project_id, last_seen_at, is_online)
  VALUES (p_user_id, p_project_id, p_last_seen_at, true)
  ON CONFLICT (user_id, project_id)
  DO UPDATE SET 
    last_seen_at = p_last_seen_at,
    is_online = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create get_online_users function to retrieve online users for a project
CREATE OR REPLACE FUNCTION get_online_users(p_project_id uuid, p_threshold_minutes int)
RETURNS TABLE (user_id uuid, last_seen_at timestamptz) AS $$
BEGIN
  RETURN QUERY
  SELECT up.user_id, up.last_seen_at
  FROM user_presence up
  WHERE up.project_id = p_project_id
    AND up.is_online = true
    AND up.last_seen_at >= (NOW() - (p_threshold_minutes * interval '1 minute'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
