-- Create referentials table for categorizing entities
CREATE TABLE referentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data_model_id UUID REFERENCES data_models(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT, -- Optional color for visual representation
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add referential_id to entities table
ALTER TABLE entities ADD COLUMN referential_id UUID REFERENCES referentials(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_referentials_data_model_id ON referentials(data_model_id);
CREATE INDEX idx_entities_referential_id ON entities(referential_id);

-- Enable RLS for referentials table
ALTER TABLE referentials ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for referentials
CREATE POLICY "Users can view referentials of their data models"
  ON referentials FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM data_models dm
    JOIN projects p ON dm.project_id = p.id
    WHERE dm.id = referentials.data_model_id AND (
      p.created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = p.id AND user_id = auth.uid()
      )
    )
  ));

CREATE POLICY "Users can create referentials in their data models"
  ON referentials FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM data_models dm
    JOIN projects p ON dm.project_id = p.id
    WHERE dm.id = referentials.data_model_id AND (
      p.created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = p.id AND user_id = auth.uid() AND role IN ('owner', 'editor')
      )
    )
  ));

CREATE POLICY "Users can update referentials in their data models"
  ON referentials FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM data_models dm
    JOIN projects p ON dm.project_id = p.id
    WHERE dm.id = referentials.data_model_id AND (
      p.created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = p.id AND user_id = auth.uid() AND role IN ('owner', 'editor')
      )
    )
  ));

CREATE POLICY "Users can delete referentials in their data models"
  ON referentials FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM data_models dm
    JOIN projects p ON dm.project_id = p.id
    WHERE dm.id = referentials.data_model_id AND (
      p.created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = p.id AND user_id = auth.uid() AND role IN ('owner', 'editor')
      )
    )
  ));

-- Create trigger for updated_at on referentials
CREATE TRIGGER update_referentials_updated_at
  BEFORE UPDATE ON referentials
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();
