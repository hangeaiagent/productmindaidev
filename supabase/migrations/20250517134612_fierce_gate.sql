/*
  # Add updated_at field to template_versions table

  1. Changes
    - Add updated_at column to template_versions table
    - Set default value to now()
    - Create trigger to automatically update the timestamp
    - Update existing rows to set updated_at

  2. Security
    - No changes to existing policies
*/

-- Add updated_at column
ALTER TABLE template_versions
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create trigger to update the timestamp
CREATE TRIGGER update_template_versions_updated_at
  BEFORE UPDATE ON template_versions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update existing rows
UPDATE template_versions
SET updated_at = created_at
WHERE updated_at IS NULL;