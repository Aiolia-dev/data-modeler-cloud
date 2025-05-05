-- Re-enable RLS for projects table and add proper policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create policy for projects table
-- This policy allows users to see only projects they are members of
CREATE POLICY "Users can view projects they are members of" ON projects
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id 
      FROM project_members 
      WHERE project_id = id
    ) OR 
    -- Superusers can see all projects
    (SELECT auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_superuser' = 'true'
  );

-- Allow users to create their own projects
CREATE POLICY "Users can create their own projects" ON projects
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Allow project owners and admins to update projects
CREATE POLICY "Project owners and admins can update projects" ON projects
  FOR UPDATE
  USING (
    created_by = auth.uid() OR
    auth.uid() IN (
      SELECT user_id 
      FROM project_members 
      WHERE project_id = id AND role = 'admin'
    ) OR
    (SELECT auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_superuser' = 'true'
  );

-- Allow project owners and admins to delete projects
CREATE POLICY "Project owners and admins can delete projects" ON projects
  FOR DELETE
  USING (
    created_by = auth.uid() OR
    auth.uid() IN (
      SELECT user_id 
      FROM project_members 
      WHERE project_id = id AND role = 'admin'
    ) OR
    (SELECT auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_superuser' = 'true'
  );
