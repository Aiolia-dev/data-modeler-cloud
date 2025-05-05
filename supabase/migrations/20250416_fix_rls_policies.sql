-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view project members of their projects" ON project_members;
DROP POLICY IF EXISTS "Project owners can manage project members" ON project_members;

-- Create simplified policies for projects
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  USING (created_by = auth.uid());

-- Create policy to allow project members to view projects they're members of
CREATE POLICY "Users can view projects they are members of"
  ON projects FOR SELECT
  USING (EXISTS (SELECT 1 FROM project_members WHERE project_id = id AND user_id = auth.uid()));

-- Create simplified policies for project_members
CREATE POLICY "Users can view their own project memberships"
  ON project_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Project owners can view all project members"
  ON project_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM projects WHERE id = project_members.project_id AND created_by = auth.uid()));

CREATE POLICY "Project owners can manage project members"
  ON project_members FOR ALL
  USING (EXISTS (SELECT 1 FROM projects WHERE id = project_members.project_id AND created_by = auth.uid()));

-- Create policy for data_models to ensure proper access
DROP POLICY IF EXISTS "Users can view data models of their projects" ON data_models;
CREATE POLICY "Users can view data models of their projects"
  ON data_models FOR SELECT
  USING ((EXISTS (SELECT 1 FROM projects WHERE id = project_id AND created_by = auth.uid())) OR
         (EXISTS (SELECT 1 FROM project_members WHERE project_id = data_models.project_id AND user_id = auth.uid())));

-- Create policy for entities to ensure proper access
DROP POLICY IF EXISTS "Users can view entities of their data models" ON entities;
CREATE POLICY "Users can view entities of their data models"
  ON entities FOR SELECT
  USING (EXISTS (SELECT 1 FROM data_models 
                 WHERE id = data_model_id AND 
                 (EXISTS (SELECT 1 FROM projects WHERE id = data_models.project_id AND created_by = auth.uid()) OR
                  EXISTS (SELECT 1 FROM project_members WHERE project_id = data_models.project_id AND user_id = auth.uid()))));
