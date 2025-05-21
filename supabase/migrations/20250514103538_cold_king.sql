/*
  # Template System Tables

  1. New Tables
    - `template_categories`
      - `id` (uuid, primary key)
      - `parent_id` (uuid, self-referential foreign key)
      - `name_en` (text)
      - `name_zh` (text)
      - `description_en` (text)
      - `description_zh` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `templates`
      - `id` (uuid, primary key)
      - `category_id` (uuid, foreign key to template_categories)
      - `name_en` (text)
      - `name_zh` (text)
      - `description_en` (text)
      - `description_zh` (text)
      - `prompt_content` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Functions and Triggers
    - Updated_at timestamp trigger function
    - Triggers for both tables to maintain updated_at
*/

-- Create template categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS template_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES template_categories(id),
  name_en text NOT NULL,
  name_zh text NOT NULL,
  description_en text,
  description_zh text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create templates table if it doesn't exist
CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES template_categories(id) ON DELETE CASCADE,
  name_en text NOT NULL,
  name_zh text NOT NULL,
  description_en text,
  description_zh text,
  prompt_content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create or replace the updated_at function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_template_categories_updated_at ON template_categories;
DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;

-- Create new triggers
CREATE TRIGGER update_template_categories_updated_at
  BEFORE UPDATE ON template_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();