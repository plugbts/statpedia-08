-- Add username field to auth_user table
-- This field will store the unique @handle for each user

ALTER TABLE auth_user 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Create an index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_auth_user_username ON auth_user(username);

-- Add a comment to explain the field
COMMENT ON COLUMN auth_user.username IS 'Unique @handle for user (e.g., @user_x7f3a). Generated randomly at signup until user customizes.';
COMMENT ON COLUMN auth_user.display_name IS 'User-friendly display name shown in UI (e.g., "John Doe"). Free-form text from signup form.';
COMMENT ON COLUMN auth_user.email IS 'Private email address used only for login and notifications. Never shown publicly.';
