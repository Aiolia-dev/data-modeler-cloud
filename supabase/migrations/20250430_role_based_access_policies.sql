-- Role-based access control policies for the Data Modeler Cloud application
-- This migration adds policies that enforce access based on user roles in project_members table:
-- - Viewers: Can only view data (SELECT)
-- - Editors: Can view and modify data (SELECT, INSERT, UPDATE)
-- - Admins: Full access (SELECT, INSERT, UPDATE, DELETE)

-- Helper function to check user's role for a project
CREATE OR REPLACE FUNCTION get_user_project_role(project_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Check if user is the project creator (implicit admin)
  SELECT 'admin' INTO user_role
  FROM projects
  WHERE id = project_id AND created_by = auth.uid();
  
  -- If not the creator, check project_members table
  IF user_role IS NULL THEN
    SELECT role INTO user_role
    FROM project_members
    WHERE project_id = project_id AND user_id = auth.uid();
  END IF;
  
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check user's role for a data model
CREATE OR REPLACE FUNCTION get_user_data_model_role(data_model_id UUID)
RETURNS TEXT AS $$
DECLARE
  project_id UUID;
  user_role TEXT;
BEGIN
  -- Get the project_id for this data model
  SELECT dm.project_id INTO project_id
  FROM data_models dm
  WHERE dm.id = data_model_id;
  
  -- Use the project role helper function
  RETURN get_user_project_role(project_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check user's role for an entity
CREATE OR REPLACE FUNCTION get_user_entity_role(entity_id UUID)
RETURNS TEXT AS $$
DECLARE
  data_model_id UUID;
  user_role TEXT;
BEGIN
  -- Get the data_model_id for this entity
  SELECT e.data_model_id INTO data_model_id
  FROM entities e
  WHERE e.id = entity_id;
  
  -- Use the data model role helper function
  RETURN get_user_data_model_role(data_model_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check user's role for an attribute
CREATE OR REPLACE FUNCTION get_user_attribute_role(attribute_id UUID)
RETURNS TEXT AS $$
DECLARE
  entity_id UUID;
  user_role TEXT;
BEGIN
  -- Get the entity_id for this attribute
  SELECT a.entity_id INTO entity_id
  FROM attributes a
  WHERE a.id = attribute_id;
  
  -- Use the entity role helper function
  RETURN get_user_entity_role(entity_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check user's role for a relationship
CREATE OR REPLACE FUNCTION get_user_relationship_role(relationship_id UUID)
RETURNS TEXT AS $$
DECLARE
  data_model_id UUID;
  user_role TEXT;
BEGIN
  -- Get the data_model_id for this relationship
  SELECT r.data_model_id INTO data_model_id
  FROM relationships r
  WHERE r.id = relationship_id;
  
  -- Use the data model role helper function
  RETURN get_user_data_model_role(data_model_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies to replace them with role-based ones
-- Projects
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can view projects they are members of" ON projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

-- Project members
DROP POLICY IF EXISTS "Users can view their own project memberships" ON project_members;
DROP POLICY IF EXISTS "Project owners can view all project members" ON project_members;
DROP POLICY IF EXISTS "Project owners can manage project members" ON project_members;

-- Data models
DROP POLICY IF EXISTS "Users can view data models of their projects" ON data_models;

-- Entities
DROP POLICY IF EXISTS "Users can view entities of their data models" ON entities;

-- Create new role-based policies
-- Projects
CREATE POLICY "All users can view projects they are members of"
  ON projects FOR SELECT
  USING (created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_id = projects.id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can create their own projects"
  ON projects FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Editors and admins can update projects"
  ON projects FOR UPDATE
  USING (
    created_by = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_id = projects.id AND user_id = auth.uid() AND role IN ('editor', 'admin')
    )
  );

CREATE POLICY "Only admins can delete projects"
  ON projects FOR DELETE
  USING (
    created_by = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_id = projects.id AND user_id = auth.uid() AND role = 'admin'
    )
  );

-- Project members
CREATE POLICY "All users can view project members"
  ON project_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id AND pm.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_members.project_id AND p.created_by = auth.uid()
    )
  );

CREATE POLICY "Only admins can manage project members"
  ON project_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_members.project_id AND p.created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id AND pm.user_id = auth.uid() AND pm.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update project members"
  ON project_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_members.project_id AND p.created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id AND pm.user_id = auth.uid() AND pm.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete project members"
  ON project_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_members.project_id AND p.created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id AND pm.user_id = auth.uid() AND pm.role = 'admin'
    )
  );

-- Data models
CREATE POLICY "All users can view data models of their projects"
  ON data_models FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = data_models.project_id AND (
        p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Editors and admins can create data models"
  ON data_models FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = data_models.project_id AND (
        p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('editor', 'admin')
        )
      )
    )
  );

CREATE POLICY "Editors and admins can update data models"
  ON data_models FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = data_models.project_id AND (
        p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('editor', 'admin')
        )
      )
    )
  );

CREATE POLICY "Only admins can delete data models"
  ON data_models FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = data_models.project_id AND (
        p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role = 'admin'
        )
      )
    )
  );

-- Entities
CREATE POLICY "All users can view entities"
  ON entities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM data_models dm
      JOIN projects p ON p.id = dm.project_id
      WHERE dm.id = entities.data_model_id AND (
        p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Editors and admins can create entities"
  ON entities FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM data_models dm
      JOIN projects p ON p.id = dm.project_id
      WHERE dm.id = entities.data_model_id AND (
        p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('editor', 'admin')
        )
      )
    )
  );

CREATE POLICY "Editors and admins can update entities"
  ON entities FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM data_models dm
      JOIN projects p ON p.id = dm.project_id
      WHERE dm.id = entities.data_model_id AND (
        p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('editor', 'admin')
        )
      )
    )
  );

CREATE POLICY "Only admins can delete entities"
  ON entities FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM data_models dm
      JOIN projects p ON p.id = dm.project_id
      WHERE dm.id = entities.data_model_id AND (
        p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role = 'admin'
        )
      )
    )
  );

-- Attributes
CREATE POLICY "All users can view attributes"
  ON attributes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM entities e
      JOIN data_models dm ON dm.id = e.data_model_id
      JOIN projects p ON p.id = dm.project_id
      WHERE e.id = attributes.entity_id AND (
        p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Editors and admins can create attributes"
  ON attributes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM entities e
      JOIN data_models dm ON dm.id = e.data_model_id
      JOIN projects p ON p.id = dm.project_id
      WHERE e.id = attributes.entity_id AND (
        p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('editor', 'admin')
        )
      )
    )
  );

CREATE POLICY "Editors and admins can update attributes"
  ON attributes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM entities e
      JOIN data_models dm ON dm.id = e.data_model_id
      JOIN projects p ON p.id = dm.project_id
      WHERE e.id = attributes.entity_id AND (
        p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('editor', 'admin')
        )
      )
    )
  );

CREATE POLICY "Only admins can delete attributes"
  ON attributes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM entities e
      JOIN data_models dm ON dm.id = e.data_model_id
      JOIN projects p ON p.id = dm.project_id
      WHERE e.id = attributes.entity_id AND (
        p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role = 'admin'
        )
      )
    )
  );

-- Relationships
CREATE POLICY "All users can view relationships"
  ON relationships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM data_models dm
      JOIN projects p ON p.id = dm.project_id
      WHERE dm.id = relationships.data_model_id AND (
        p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Editors and admins can create relationships"
  ON relationships FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM data_models dm
      JOIN projects p ON p.id = dm.project_id
      WHERE dm.id = relationships.data_model_id AND (
        p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('editor', 'admin')
        )
      )
    )
  );

CREATE POLICY "Editors and admins can update relationships"
  ON relationships FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM data_models dm
      JOIN projects p ON p.id = dm.project_id
      WHERE dm.id = relationships.data_model_id AND (
        p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('editor', 'admin')
        )
      )
    )
  );

CREATE POLICY "Only admins can delete relationships"
  ON relationships FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM data_models dm
      JOIN projects p ON p.id = dm.project_id
      WHERE dm.id = relationships.data_model_id AND (
        p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role = 'admin'
        )
      )
    )
  );

-- Comments
CREATE POLICY "All users can view comments"
  ON comments FOR SELECT
  USING (
    (entity_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM entities e
      JOIN data_models dm ON dm.id = e.data_model_id
      JOIN projects p ON p.id = dm.project_id
      WHERE e.id = comments.entity_id AND (
        p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
        )
      )
    )) OR
    (attribute_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM attributes a
      JOIN entities e ON e.id = a.entity_id
      JOIN data_models dm ON dm.id = e.data_model_id
      JOIN projects p ON p.id = dm.project_id
      WHERE a.id = comments.attribute_id AND (
        p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
        )
      )
    )) OR
    (relationship_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM relationships r
      JOIN data_models dm ON dm.id = r.data_model_id
      JOIN projects p ON p.id = dm.project_id
      WHERE r.id = comments.relationship_id AND (
        p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
        )
      )
    ))
  );

CREATE POLICY "All users can create comments"
  ON comments FOR INSERT
  WITH CHECK (
    (entity_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM entities e
      JOIN data_models dm ON dm.id = e.data_model_id
      JOIN projects p ON p.id = dm.project_id
      WHERE e.id = comments.entity_id AND (
        p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
        )
      )
    )) OR
    (attribute_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM attributes a
      JOIN entities e ON e.id = a.entity_id
      JOIN data_models dm ON dm.id = e.data_model_id
      JOIN projects p ON p.id = dm.project_id
      WHERE a.id = comments.attribute_id AND (
        p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
        )
      )
    )) OR
    (relationship_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM relationships r
      JOIN data_models dm ON dm.id = r.data_model_id
      JOIN projects p ON p.id = dm.project_id
      WHERE r.id = comments.relationship_id AND (
        p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
        )
      )
    ))
  );

CREATE POLICY "Users can update their own comments"
  ON comments FOR UPDATE
  USING (
    user_id = auth.uid()
  );

CREATE POLICY "Admins can update any comments"
  ON comments FOR UPDATE
  USING (
    (entity_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM entities e
      JOIN data_models dm ON dm.id = e.data_model_id
      JOIN projects p ON p.id = dm.project_id
      WHERE e.id = comments.entity_id AND (
        p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role = 'admin'
        )
      )
    )) OR
    (attribute_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM attributes a
      JOIN entities e ON e.id = a.entity_id
      JOIN data_models dm ON dm.id = e.data_model_id
      JOIN projects p ON p.id = dm.project_id
      WHERE a.id = comments.attribute_id AND (
        p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role = 'admin'
        )
      )
    )) OR
    (relationship_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM relationships r
      JOIN data_models dm ON dm.id = r.data_model_id
      JOIN projects p ON p.id = dm.project_id
      WHERE r.id = comments.relationship_id AND (
        p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role = 'admin'
        )
      )
    ))
  );

CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE
  USING (
    user_id = auth.uid()
  );

CREATE POLICY "Admins can delete any comments"
  ON comments FOR DELETE
  USING (
    (entity_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM entities e
      JOIN data_models dm ON dm.id = e.data_model_id
      JOIN projects p ON p.id = dm.project_id
      WHERE e.id = comments.entity_id AND (
        p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role = 'admin'
        )
      )
    )) OR
    (attribute_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM attributes a
      JOIN entities e ON e.id = a.entity_id
      JOIN data_models dm ON dm.id = e.data_model_id
      JOIN projects p ON p.id = dm.project_id
      WHERE a.id = comments.attribute_id AND (
        p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role = 'admin'
        )
      )
    )) OR
    (relationship_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM relationships r
      JOIN data_models dm ON dm.id = r.data_model_id
      JOIN projects p ON p.id = dm.project_id
      WHERE r.id = comments.relationship_id AND (
        p.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role = 'admin'
        )
      )
    ))
  );

-- Apply similar policies to other tables (audit_logs, rules, etc.)
