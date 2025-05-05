-- Add email column to project_members table
ALTER TABLE project_members ADD COLUMN IF NOT EXISTS email TEXT;

-- Update existing project_members with email from auth.users
UPDATE project_members
SET email = users.email
FROM auth.users AS users
WHERE project_members.user_id = users.id
AND project_members.email IS NULL;
