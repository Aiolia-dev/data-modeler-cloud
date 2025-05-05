-- Create schema for data modeler application

-- Note: users table is handled by Supabase Auth, but we can extend it with additional fields if needed

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Project members table (for collaboration)
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Data models table
CREATE TABLE data_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  version TEXT DEFAULT '1.0'
);

-- Entities table
CREATE TABLE entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data_model_id UUID REFERENCES data_models(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  position_x FLOAT DEFAULT 0,
  position_y FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attributes table
CREATE TABLE attributes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  data_type TEXT NOT NULL,
  description TEXT,
  is_primary_key BOOLEAN DEFAULT FALSE,
  is_foreign_key BOOLEAN DEFAULT FALSE,
  is_unique BOOLEAN DEFAULT FALSE,
  is_mandatory BOOLEAN DEFAULT FALSE,
  is_calculated BOOLEAN DEFAULT FALSE,
  calculation_rule TEXT,
  dependent_attribute_id UUID REFERENCES attributes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Relationships table
CREATE TABLE relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data_model_id UUID REFERENCES data_models(id) ON DELETE CASCADE,
  source_entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  target_entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  source_attribute_id UUID REFERENCES attributes(id) ON DELETE SET NULL,
  target_attribute_id UUID REFERENCES attributes(id) ON DELETE SET NULL,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('one-to-one', 'one-to-many', 'many-to-many')),
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  attribute_id UUID REFERENCES attributes(id) ON DELETE CASCADE,
  relationship_id UUID REFERENCES relationships(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (
    (entity_id IS NOT NULL AND attribute_id IS NULL AND relationship_id IS NULL) OR
    (entity_id IS NULL AND attribute_id IS NOT NULL AND relationship_id IS NULL) OR
    (entity_id IS NULL AND attribute_id IS NULL AND relationship_id IS NOT NULL)
  )
);

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  data_model_id UUID REFERENCES data_models(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
  attribute_id UUID REFERENCES attributes(id) ON DELETE SET NULL,
  relationship_id UUID REFERENCES relationships(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('create', 'update', 'delete')),
  previous_value JSONB,
  new_value JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_data_models_project_id ON data_models(project_id);
CREATE INDEX idx_entities_data_model_id ON entities(data_model_id);
CREATE INDEX idx_attributes_entity_id ON attributes(entity_id);
CREATE INDEX idx_relationships_data_model_id ON relationships(data_model_id);
CREATE INDEX idx_relationships_source_entity_id ON relationships(source_entity_id);
CREATE INDEX idx_relationships_target_entity_id ON relationships(target_entity_id);
CREATE INDEX idx_comments_entity_id ON comments(entity_id);
CREATE INDEX idx_comments_attribute_id ON comments(attribute_id);
CREATE INDEX idx_comments_relationship_id ON comments(relationship_id);
CREATE INDEX idx_audit_logs_data_model_id ON audit_logs(data_model_id);

-- Create RLS (Row Level Security) policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Project access policies
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  USING (created_by = auth.uid() OR 
         EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = auth.uid()));

CREATE POLICY "Users can create their own projects"
  ON projects FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  USING (created_by = auth.uid() OR 
         EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = auth.uid() AND role IN ('owner', 'editor')));

CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE
  USING (created_by = auth.uid() OR 
         EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = auth.uid() AND role = 'owner'));

-- Project members access policies
CREATE POLICY "Users can view project members of their projects"
  ON project_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM projects WHERE id = project_members.project_id AND 
                (created_by = auth.uid() OR 
                 EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = project_members.project_id AND pm.user_id = auth.uid()))));

CREATE POLICY "Project owners can manage project members"
  ON project_members FOR ALL
  USING (EXISTS (SELECT 1 FROM projects WHERE id = project_members.project_id AND 
                (created_by = auth.uid() OR 
                 EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = project_members.project_id AND pm.user_id = auth.uid() AND pm.role = 'owner'))));

-- Similar policies for other tables
-- For brevity, I'm not including all policies, but you would create similar ones for each table

-- Create functions for automatic updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_data_models_updated_at
  BEFORE UPDATE ON data_models
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_entities_updated_at
  BEFORE UPDATE ON entities
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_attributes_updated_at
  BEFORE UPDATE ON attributes
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_relationships_updated_at
  BEFORE UPDATE ON relationships
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();
