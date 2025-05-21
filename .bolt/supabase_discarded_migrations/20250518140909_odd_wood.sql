/*
  # Update template versions schema and functions

  1. Changes
    - Add project_id column to template_versions table
    - Update version number generation to be project-specific
    - Update version status management function
    - Update RLS policies
    
  2. Security
    - Maintain existing RLS policies with project_id checks
*/

-- Add project_id to template_versions
ALTER TABLE template_versions
ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES user_projects(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_template_versions_project ON template_versions(project_id);

-- Update version number generation function to be project-specific
CREATE OR REPLACE FUNCTION generate_template_version_number()
RETURNS TRIGGER AS $$
DECLARE
  latest_version INTEGER;
BEGIN
  -- Find the highest version number for this project and template
  SELECT COALESCE(MAX(version_number), 0) INTO latest_version
  FROM template_versions
  WHERE project_id = NEW.project_id
  AND template_id = NEW.template_id;
  
  IF latest_version IS NULL THEN
    latest_version := 0;
  END IF;
  
  NEW.version_number := latest_version + 1;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '生成版本号时发生错误: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Update version status management function
CREATE OR REPLACE FUNCTION manage_template_version_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting new version as active, deactivate other versions for the same project and template
  IF NEW.is_active = true THEN
    UPDATE template_versions
    SET is_active = false,
        updated_at = now()
    WHERE project_id = NEW.project_id
    AND template_id = NEW.template_id
    AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update RLS policies
DROP POLICY IF EXISTS "Users can read template versions" ON template_versions;
DROP POLICY IF EXISTS "Users can update their own template versions" ON template_versions;
DROP POLICY IF EXISTS "Users can delete their own inactive template versions" ON template_versions;

CREATE POLICY "Users can read template versions"
  ON template_versions
  FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM user_projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own template versions"
  ON template_versions
  FOR UPDATE
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM user_projects WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM user_projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own inactive template versions"
  ON template_versions
  FOR DELETE
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM user_projects WHERE user_id = auth.uid()
    )
    AND is_active = false
  );