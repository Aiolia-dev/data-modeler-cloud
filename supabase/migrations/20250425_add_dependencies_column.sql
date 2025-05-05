-- Migration to add dependencies column to rules table
-- This column will store an array of rule IDs that a rule depends on

-- First, check if the column already exists to avoid errors
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'rules'
        AND column_name = 'dependencies'
    ) THEN
        -- Add the dependencies column as a text array (storing rule IDs)
        ALTER TABLE rules
        ADD COLUMN dependencies text[] DEFAULT NULL;

        -- Add a comment to the column for documentation
        COMMENT ON COLUMN rules.dependencies IS 'Array of rule IDs that this rule depends on';
    END IF;
END $$;

-- Simplified approach: Skip RLS policy recreation since we don't know the exact structure
-- Just add the column without modifying existing policies

-- Create an index on the dependencies column for better query performance
CREATE INDEX IF NOT EXISTS idx_rules_dependencies ON rules USING gin (dependencies);
