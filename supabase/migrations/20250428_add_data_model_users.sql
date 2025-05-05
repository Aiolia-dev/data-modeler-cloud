-- Create data_model_users table for granular access control
CREATE TABLE data_model_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data_model_id UUID REFERENCES data_models(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(data_model_id, user_id)
);

-- Create a view to get user information along with their assigned data models
CREATE VIEW user_data_model_access AS
SELECT
  u.id as user_id,
  u.email,
  u.confirmed_at,
  dmu.data_model_id,
  dmu.role,
  dm.name as data_model_name,
  dm.project_id
FROM
  auth.users u
LEFT JOIN
  data_model_users dmu ON u.id = dmu.user_id
LEFT JOIN
  data_models dm ON dmu.data_model_id = dm.id;

-- Enable RLS on the data_model_users table
ALTER TABLE data_model_users ENABLE ROW LEVEL SECURITY;

-- Create policy for superusers to manage data model users
CREATE POLICY "Superusers can manage data model users"
  ON data_model_users
  USING (EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND raw_user_meta_data->>'is_superuser' = 'true'
  ));

-- Create policy for data model owners to view assigned users
CREATE POLICY "Data model owners can view assigned users"
  ON data_model_users FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM data_models
    WHERE id = data_model_id AND created_by = auth.uid()
  ));

-- Update the data_models RLS policy to include the new access control
DROP POLICY IF EXISTS "Users can view data models of their projects" ON data_models;

CREATE POLICY "Users can view data models they have access to"
  ON data_models FOR SELECT
  USING (
    -- User created the project
    (EXISTS (SELECT 1 FROM projects WHERE id = project_id AND created_by = auth.uid()))
    OR
    -- User is assigned to the data model
    (EXISTS (SELECT 1 FROM data_model_users WHERE data_model_id = id AND user_id = auth.uid()))
    OR
    -- User is a superuser
    (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'is_superuser' = 'true'))
  );
