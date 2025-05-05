-- Migration: Add position columns to comments table
-- This allows comments to be positioned freely on the diagram canvas

-- Add position_x and position_y columns to the comments table
ALTER TABLE comments 
ADD COLUMN position_x DOUBLE PRECISION,
ADD COLUMN position_y DOUBLE PRECISION;

-- Update the CHECK constraint to allow for free-floating comments
-- A comment can now be associated with an entity, attribute, relationship, OR positioned on the canvas
ALTER TABLE comments 
DROP CONSTRAINT IF EXISTS comments_check;

ALTER TABLE comments
ADD CONSTRAINT comments_check CHECK (
  (entity_id IS NOT NULL AND attribute_id IS NULL AND relationship_id IS NULL AND position_x IS NULL AND position_y IS NULL) OR
  (entity_id IS NULL AND attribute_id IS NOT NULL AND relationship_id IS NULL AND position_x IS NULL AND position_y IS NULL) OR
  (entity_id IS NULL AND attribute_id IS NULL AND relationship_id IS NOT NULL AND position_x IS NULL AND position_y IS NULL) OR
  (entity_id IS NULL AND attribute_id IS NULL AND relationship_id IS NULL AND position_x IS NOT NULL AND position_y IS NOT NULL)
);

-- Add an index to improve performance when querying comments by position
CREATE INDEX idx_comments_position ON comments (position_x, position_y) 
WHERE position_x IS NOT NULL AND position_y IS NOT NULL;

-- Add data_model_id column to associate free-floating comments with a specific data model
ALTER TABLE comments
ADD COLUMN data_model_id UUID REFERENCES data_models(id) ON DELETE CASCADE;

-- Update the constraint to ensure data_model_id is provided for free-floating comments
ALTER TABLE comments
ADD CONSTRAINT comments_data_model_id_check CHECK (
  (position_x IS NULL AND position_y IS NULL) OR
  (position_x IS NOT NULL AND position_y IS NOT NULL AND data_model_id IS NOT NULL)
);

COMMENT ON COLUMN comments.position_x IS 'X coordinate for free-floating comments on the diagram';
COMMENT ON COLUMN comments.position_y IS 'Y coordinate for free-floating comments on the diagram';
COMMENT ON COLUMN comments.data_model_id IS 'Reference to the data model for free-floating comments';
