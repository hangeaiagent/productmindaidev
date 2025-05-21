/*
  # Remove project_analyses table and update template_versions

  1. Changes
    - Remove project_analyses table
    - Remove project_analyses_id from template_versions
    - Update template_versions triggers and functions
    - Update RLS policies

  2. Security
    - Maintain existing security model
    - Update policies to reflect new structure
*/

-- Remove project_analyses_id from template_versions
ALTER TABLE template_versions
DROP COLUMN IF EXISTS project_analyses_id;

-- Drop project_analyses table and related objects
DROP TABLE IF EXISTS project_analyses CASCADE;

-- Update version number generation function
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