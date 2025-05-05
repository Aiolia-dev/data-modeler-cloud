-- Migration to modify the rules_check constraint to allow both entity_id and attribute_id to be set

-- First, identify the constraint
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Get the constraint name
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'rules'::regclass
    AND conname = 'rules_check';
    
    -- If constraint exists, drop it
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE rules DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'Constraint rules_check not found';
    END IF;
END $$;

-- Add a new constraint that requires at least one of entity_id or attribute_id to be non-null
-- but allows both to be set
ALTER TABLE rules
ADD CONSTRAINT rules_check
CHECK (
    entity_id IS NOT NULL OR attribute_id IS NOT NULL
);

-- Add a comment explaining the constraint
COMMENT ON CONSTRAINT rules_check ON rules IS 'Ensures that at least one of entity_id or attribute_id is set, but allows both to be set';
