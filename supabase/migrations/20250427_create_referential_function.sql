-- Create a function to insert a referential directly
CREATE OR REPLACE FUNCTION create_referential(
  p_name TEXT,
  p_description TEXT,
  p_color TEXT,
  p_data_model_id UUID,
  p_created_by UUID
) RETURNS JSONB AS $$
DECLARE
  v_referential_id UUID;
  v_result JSONB;
BEGIN
  -- Insert the referential
  INSERT INTO referentials (
    name,
    description,
    color,
    data_model_id,
    created_by
  ) VALUES (
    p_name,
    p_description,
    p_color,
    p_data_model_id,
    p_created_by
  )
  RETURNING id INTO v_referential_id;
  
  -- Get the full referential data
  SELECT row_to_json(r)::jsonb INTO v_result
  FROM referentials r
  WHERE r.id = v_referential_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
