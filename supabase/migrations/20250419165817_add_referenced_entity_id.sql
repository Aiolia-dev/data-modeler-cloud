-- Add referenced_entity_id column to attributes table
ALTER TABLE attributes
ADD COLUMN referenced_entity_id UUID REFERENCES entities(id) ON DELETE SET NULL;

-- Add comment explaining the column purpose
COMMENT ON COLUMN attributes.referenced_entity_id IS 'References the entity that this attribute (if it is a foreign key) points to';

-- Update existing foreign keys based on naming convention
DO $$
DECLARE
    attr RECORD;
    target_entity RECORD;
BEGIN
    -- Find attributes that look like foreign keys (start with 'id' and are of type integer)
    FOR attr IN 
        SELECT a.id, a.name, a.entity_id, e.name as entity_name
        FROM attributes a
        JOIN entities e ON a.entity_id = e.id
        WHERE a.is_foreign_key = true OR (a.name LIKE 'id%' AND a.data_type = 'integer')
    LOOP
        -- Extract potential entity name from attribute name (e.g., 'idCountry' -> 'Country')
        IF attr.name LIKE 'id%' AND LENGTH(attr.name) > 2 THEN
            -- Find entity with matching name
            SELECT id INTO target_entity
            FROM entities
            WHERE LOWER(name) = LOWER(SUBSTRING(attr.name FROM 3));
            
            -- If found, update the referenced_entity_id
            IF target_entity.id IS NOT NULL THEN
                UPDATE attributes
                SET 
                    referenced_entity_id = target_entity.id,
                    is_foreign_key = true
                WHERE id = attr.id;
                
                RAISE NOTICE 'Updated foreign key: % in entity % to reference entity ID %', 
                             attr.name, attr.entity_name, target_entity.id;
            END IF;
        END IF;
    END LOOP;
END;
$$;