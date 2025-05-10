-- E-commerce Data Model - Wave 1: Core Entities
-- This script creates the fundamental tables for the e-commerce platform

-- Create a new data model record
INSERT INTO data_models (id, name, description, project_id, version, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'E-commerce Platform',
  'Comprehensive data model for an e-commerce platform with products, users, orders, and more',
  '{{project_id}}', -- Replace with your actual project ID
  '1.0',
  NOW(),
  NOW()
);

-- Store the data model ID for reference in subsequent scripts
-- In Supabase SQL Editor, you would need to manually copy this ID after running this script
-- SELECT id FROM data_models WHERE name = 'E-commerce Platform' ORDER BY created_at DESC LIMIT 1;

-- ==================== WAVE 1: USER-RELATED ENTITIES ====================

-- 1. User Entity
INSERT INTO entities (id, name, description, data_model_id, position_x, position_y, color, is_join_table, referential, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'User',
  'Stores information about registered users of the platform',
  '{{data_model_id}}', -- Replace with the data model ID from above
  100, 100,
  '#3498db', -- Blue color
  false,
  'Core',
  NOW(),
  NOW()
);

-- Store the entity ID for reference
-- SELECT id FROM entities WHERE name = 'User' AND data_model_id = '{{data_model_id}}' LIMIT 1;

-- User Attributes
INSERT INTO attributes (id, name, description, data_type, is_primary_key, is_nullable, is_unique, is_foreign_key, entity_id, validation_status, is_mandatory, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'Id', 'Unique identifier for the user', 'integer', true, false, true, false, '{{user_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'Email', 'User''s email address, used for login', 'text', false, false, true, false, '{{user_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'Password', 'Hashed password for user authentication', 'text', false, false, false, false, '{{user_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'FirstName', 'User''s first name', 'text', false, false, false, false, '{{user_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'LastName', 'User''s last name', 'text', false, false, false, false, '{{user_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'Phone', 'User''s contact phone number', 'text', false, true, false, false, '{{user_entity_id}}', 'Validated', false, NOW(), NOW()),
  (gen_random_uuid(), 'IsActive', 'Indicates if the user account is active', 'boolean', false, false, false, false, '{{user_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'CreatedAt', 'Timestamp when the user account was created', 'timestamp', false, false, false, false, '{{user_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'UpdatedAt', 'Timestamp when the user account was last updated', 'timestamp', false, false, false, false, '{{user_entity_id}}', 'Validated', true, NOW(), NOW());

-- 2. Address Entity
INSERT INTO entities (id, name, description, data_model_id, position_x, position_y, color, is_join_table, referential, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Address',
  'Stores shipping and billing addresses for users',
  '{{data_model_id}}',
  350, 100,
  '#3498db', -- Blue color
  false,
  'Core',
  NOW(),
  NOW()
);

-- Store the entity ID for reference
-- SELECT id FROM entities WHERE name = 'Address' AND data_model_id = '{{data_model_id}}' LIMIT 1;

-- Address Attributes
INSERT INTO attributes (id, name, description, data_type, is_primary_key, is_nullable, is_unique, is_foreign_key, entity_id, validation_status, is_mandatory, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'Id', 'Unique identifier for the address', 'integer', true, false, true, false, '{{address_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'UserId', 'Reference to the user who owns this address', 'integer', false, false, false, true, '{{address_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'AddressLine1', 'Primary address line (street address)', 'text', false, false, false, false, '{{address_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'AddressLine2', 'Secondary address line (apt, suite, etc.)', 'text', false, true, false, false, '{{address_entity_id}}', 'Validated', false, NOW(), NOW()),
  (gen_random_uuid(), 'City', 'City name', 'text', false, false, false, false, '{{address_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'State', 'State or province', 'text', false, false, false, false, '{{address_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'PostalCode', 'ZIP or postal code', 'text', false, false, false, false, '{{address_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'Country', 'Country name', 'text', false, false, false, false, '{{address_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'AddressType', 'Type of address (Shipping, Billing, Both)', 'text', false, false, false, false, '{{address_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'IsDefault', 'Indicates if this is the default address for the user', 'boolean', false, false, false, false, '{{address_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'CreatedAt', 'Timestamp when the address was created', 'timestamp', false, false, false, false, '{{address_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'UpdatedAt', 'Timestamp when the address was last updated', 'timestamp', false, false, false, false, '{{address_entity_id}}', 'Validated', true, NOW(), NOW());

-- 3. PaymentMethod Entity
INSERT INTO entities (id, name, description, data_model_id, position_x, position_y, color, is_join_table, referential, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'PaymentMethod',
  'Stores payment methods associated with users',
  '{{data_model_id}}',
  600, 100,
  '#3498db', -- Blue color
  false,
  'Core',
  NOW(),
  NOW()
);

-- Store the entity ID for reference
-- SELECT id FROM entities WHERE name = 'PaymentMethod' AND data_model_id = '{{data_model_id}}' LIMIT 1;

-- PaymentMethod Attributes
INSERT INTO attributes (id, name, description, data_type, is_primary_key, is_nullable, is_unique, is_foreign_key, entity_id, validation_status, is_mandatory, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'Id', 'Unique identifier for the payment method', 'integer', true, false, true, false, '{{payment_method_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'UserId', 'Reference to the user who owns this payment method', 'integer', false, false, false, true, '{{payment_method_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'Type', 'Type of payment method (Credit Card, PayPal, etc.)', 'text', false, false, false, false, '{{payment_method_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'Provider', 'Payment provider (Visa, Mastercard, PayPal, etc.)', 'text', false, false, false, false, '{{payment_method_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'AccountNumber', 'Masked account number or identifier', 'text', false, false, false, false, '{{payment_method_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'ExpiryDate', 'Expiration date for the payment method', 'date', false, true, false, false, '{{payment_method_entity_id}}', 'Validated', false, NOW(), NOW()),
  (gen_random_uuid(), 'IsDefault', 'Indicates if this is the default payment method for the user', 'boolean', false, false, false, false, '{{payment_method_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'CreatedAt', 'Timestamp when the payment method was created', 'timestamp', false, false, false, false, '{{payment_method_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'UpdatedAt', 'Timestamp when the payment method was last updated', 'timestamp', false, false, false, false, '{{payment_method_entity_id}}', 'Validated', true, NOW(), NOW());

-- 4. UserRole Entity
INSERT INTO entities (id, name, description, data_model_id, position_x, position_y, color, is_join_table, referential, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'UserRole',
  'Defines roles and permissions for users',
  '{{data_model_id}}',
  100, 350,
  '#3498db', -- Blue color
  false,
  'Core',
  NOW(),
  NOW()
);

-- Store the entity ID for reference
-- SELECT id FROM entities WHERE name = 'UserRole' AND data_model_id = '{{data_model_id}}' LIMIT 1;

-- UserRole Attributes
INSERT INTO attributes (id, name, description, data_type, is_primary_key, is_nullable, is_unique, is_foreign_key, entity_id, validation_status, is_mandatory, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'Id', 'Unique identifier for the role', 'integer', true, false, true, false, '{{user_role_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'Name', 'Name of the role (Admin, Customer, etc.)', 'text', false, false, true, false, '{{user_role_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'Description', 'Description of the role and its permissions', 'text', false, true, false, false, '{{user_role_entity_id}}', 'Validated', false, NOW(), NOW()),
  (gen_random_uuid(), 'Permissions', 'JSON object containing permission settings', 'json', false, true, false, false, '{{user_role_entity_id}}', 'Validated', false, NOW(), NOW()),
  (gen_random_uuid(), 'CreatedAt', 'Timestamp when the role was created', 'timestamp', false, false, false, false, '{{user_role_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'UpdatedAt', 'Timestamp when the role was last updated', 'timestamp', false, false, false, false, '{{user_role_entity_id}}', 'Validated', true, NOW(), NOW());

-- 5. UserRoleAssignment Entity (Join Table)
INSERT INTO entities (id, name, description, data_model_id, position_x, position_y, color, is_join_table, referential, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'UserRoleAssignment',
  'Associates users with their assigned roles',
  '{{data_model_id}}',
  350, 350,
  '#3498db', -- Blue color
  true,
  'Core',
  NOW(),
  NOW()
);

-- Store the entity ID for reference
-- SELECT id FROM entities WHERE name = 'UserRoleAssignment' AND data_model_id = '{{data_model_id}}' LIMIT 1;

-- UserRoleAssignment Attributes
INSERT INTO attributes (id, name, description, data_type, is_primary_key, is_nullable, is_unique, is_foreign_key, entity_id, validation_status, is_mandatory, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'Id', 'Unique identifier for the assignment', 'integer', true, false, true, false, '{{user_role_assignment_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'UserId', 'Reference to the user', 'integer', false, false, false, true, '{{user_role_assignment_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'RoleId', 'Reference to the role', 'integer', false, false, false, true, '{{user_role_assignment_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'AssignedAt', 'Timestamp when the role was assigned to the user', 'timestamp', false, false, false, false, '{{user_role_assignment_entity_id}}', 'Validated', true, NOW(), NOW());

-- 6. UserSession Entity
INSERT INTO entities (id, name, description, data_model_id, position_x, position_y, color, is_join_table, referential, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'UserSession',
  'Tracks user login sessions',
  '{{data_model_id}}',
  600, 350,
  '#3498db', -- Blue color
  false,
  'Core',
  NOW(),
  NOW()
);

-- Store the entity ID for reference
-- SELECT id FROM entities WHERE name = 'UserSession' AND data_model_id = '{{data_model_id}}' LIMIT 1;

-- UserSession Attributes
INSERT INTO attributes (id, name, description, data_type, is_primary_key, is_nullable, is_unique, is_foreign_key, entity_id, validation_status, is_mandatory, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'Id', 'Unique identifier for the session', 'integer', true, false, true, false, '{{user_session_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'UserId', 'Reference to the user', 'integer', false, false, false, true, '{{user_session_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'Token', 'Session token for authentication', 'text', false, false, true, false, '{{user_session_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'IP', 'IP address of the user', 'text', false, false, false, false, '{{user_session_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'UserAgent', 'User agent information', 'text', false, true, false, false, '{{user_session_entity_id}}', 'Validated', false, NOW(), NOW()),
  (gen_random_uuid(), 'LastActivity', 'Timestamp of the last user activity', 'timestamp', false, false, false, false, '{{user_session_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'ExpiresAt', 'Timestamp when the session expires', 'timestamp', false, false, false, false, '{{user_session_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'CreatedAt', 'Timestamp when the session was created', 'timestamp', false, false, false, false, '{{user_session_entity_id}}', 'Validated', true, NOW(), NOW());

-- 7. Notification Entity
INSERT INTO entities (id, name, description, data_model_id, position_x, position_y, color, is_join_table, referential, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Notification',
  'Stores notifications sent to users',
  '{{data_model_id}}',
  850, 100,
  '#3498db', -- Blue color
  false,
  'Core',
  NOW(),
  NOW()
);

-- Store the entity ID for reference
-- SELECT id FROM entities WHERE name = 'Notification' AND data_model_id = '{{data_model_id}}' LIMIT 1;

-- Notification Attributes
INSERT INTO attributes (id, name, description, data_type, is_primary_key, is_nullable, is_unique, is_foreign_key, entity_id, validation_status, is_mandatory, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'Id', 'Unique identifier for the notification', 'integer', true, false, true, false, '{{notification_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'UserId', 'Reference to the user receiving the notification', 'integer', false, false, false, true, '{{notification_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'Type', 'Type of notification (Order, System, etc.)', 'text', false, false, false, false, '{{notification_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'Title', 'Title of the notification', 'text', false, false, false, false, '{{notification_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'Content', 'Content of the notification', 'text', false, false, false, false, '{{notification_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'IsRead', 'Indicates if the notification has been read', 'boolean', false, false, false, false, '{{notification_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'CreatedAt', 'Timestamp when the notification was created', 'timestamp', false, false, false, false, '{{notification_entity_id}}', 'Validated', true, NOW(), NOW());

-- 8. AuditLog Entity
INSERT INTO entities (id, name, description, data_model_id, position_x, position_y, color, is_join_table, referential, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'AuditLog',
  'Tracks changes to data for auditing purposes',
  '{{data_model_id}}',
  850, 350,
  '#3498db', -- Blue color
  false,
  'Core',
  NOW(),
  NOW()
);

-- Store the entity ID for reference
-- SELECT id FROM entities WHERE name = 'AuditLog' AND data_model_id = '{{data_model_id}}' LIMIT 1;

-- AuditLog Attributes
INSERT INTO attributes (id, name, description, data_type, is_primary_key, is_nullable, is_unique, is_foreign_key, entity_id, validation_status, is_mandatory, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'Id', 'Unique identifier for the audit log entry', 'integer', true, false, true, false, '{{audit_log_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'UserId', 'Reference to the user who performed the action', 'integer', false, true, false, true, '{{audit_log_entity_id}}', 'Validated', false, NOW(), NOW()),
  (gen_random_uuid(), 'Action', 'Type of action performed (Create, Update, Delete)', 'text', false, false, false, false, '{{audit_log_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'EntityType', 'Type of entity that was modified', 'text', false, false, false, false, '{{audit_log_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'EntityId', 'ID of the entity that was modified', 'text', false, false, false, false, '{{audit_log_entity_id}}', 'Validated', true, NOW(), NOW()),
  (gen_random_uuid(), 'OldValues', 'JSON object containing previous values', 'json', false, true, false, false, '{{audit_log_entity_id}}', 'Validated', false, NOW(), NOW()),
  (gen_random_uuid(), 'NewValues', 'JSON object containing new values', 'json', false, true, false, false, '{{audit_log_entity_id}}', 'Validated', false, NOW(), NOW()),
  (gen_random_uuid(), 'IP', 'IP address of the user', 'text', false, true, false, false, '{{audit_log_entity_id}}', 'Validated', false, NOW(), NOW()),
  (gen_random_uuid(), 'UserAgent', 'User agent information', 'text', false, true, false, false, '{{audit_log_entity_id}}', 'Validated', false, NOW(), NOW()),
  (gen_random_uuid(), 'CreatedAt', 'Timestamp when the audit log entry was created', 'timestamp', false, false, false, false, '{{audit_log_entity_id}}', 'Validated', true, NOW(), NOW());

-- Create relationships between Wave 1 entities

-- User to Address (one-to-many)
INSERT INTO relationships (id, name, description, source_entity_id, target_entity_id, type, source_cardinality, target_cardinality, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'has',
  'A user can have multiple addresses',
  '{{user_entity_id}}',
  '{{address_entity_id}}',
  'one-to-many',
  '1',
  '0..n',
  NOW(),
  NOW()
);

-- User to PaymentMethod (one-to-many)
INSERT INTO relationships (id, name, description, source_entity_id, target_entity_id, type, source_cardinality, target_cardinality, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'has',
  'A user can have multiple payment methods',
  '{{user_entity_id}}',
  '{{payment_method_entity_id}}',
  'one-to-many',
  '1',
  '0..n',
  NOW(),
  NOW()
);

-- User to UserRoleAssignment (one-to-many)
INSERT INTO relationships (id, name, description, source_entity_id, target_entity_id, type, source_cardinality, target_cardinality, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'has',
  'A user can be assigned multiple roles',
  '{{user_entity_id}}',
  '{{user_role_assignment_entity_id}}',
  'one-to-many',
  '1',
  '0..n',
  NOW(),
  NOW()
);

-- UserRole to UserRoleAssignment (one-to-many)
INSERT INTO relationships (id, name, description, source_entity_id, target_entity_id, type, source_cardinality, target_cardinality, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'assigned to',
  'A role can be assigned to multiple users',
  '{{user_role_entity_id}}',
  '{{user_role_assignment_entity_id}}',
  'one-to-many',
  '1',
  '0..n',
  NOW(),
  NOW()
);

-- User to UserSession (one-to-many)
INSERT INTO relationships (id, name, description, source_entity_id, target_entity_id, type, source_cardinality, target_cardinality, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'has',
  'A user can have multiple login sessions',
  '{{user_entity_id}}',
  '{{user_session_entity_id}}',
  'one-to-many',
  '1',
  '0..n',
  NOW(),
  NOW()
);

-- User to Notification (one-to-many)
INSERT INTO relationships (id, name, description, source_entity_id, target_entity_id, type, source_cardinality, target_cardinality, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'receives',
  'A user can receive multiple notifications',
  '{{user_entity_id}}',
  '{{notification_entity_id}}',
  'one-to-many',
  '1',
  '0..n',
  NOW(),
  NOW()
);

-- User to AuditLog (one-to-many)
INSERT INTO relationships (id, name, description, source_entity_id, target_entity_id, type, source_cardinality, target_cardinality, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'generates',
  'A user can generate multiple audit log entries',
  '{{user_entity_id}}',
  '{{audit_log_entity_id}}',
  'one-to-many',
  '1',
  '0..n',
  NOW(),
  NOW()
);
