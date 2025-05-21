/*
  # Add default project management
  
  1. Changes
    - Add is_default field to user_projects table
    - Create function to manage default project status
    - Create trigger to automatically update default status
    
  2. Functionality
    - Only one project can be default per user
    - When setting a project as default, other projects for that user are set to non-default
*/

-- Add is_default column
ALTER TABLE user_projects
ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;

-- Create function to manage default project status
CREATE OR REPLACE FUNCTION manage_default_project()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting new project as default, unset others
  IF NEW.is_default = true THEN
    UPDATE user_projects
    SET is_default = false
    WHERE user_id = NEW.user_id
    AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER manage_default_project_trigger
  BEFORE INSERT OR UPDATE OF is_default ON user_projects
  FOR EACH ROW
  EXECUTE FUNCTION manage_default_project();