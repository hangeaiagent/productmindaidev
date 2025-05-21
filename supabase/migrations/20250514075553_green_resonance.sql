/*
  # Initial Database Schema

  1. New Tables
    - `users`: Store user information and authentication details
      - `id` (uuid, primary key): User's unique identifier
      - `email` (text): User's email address
      - `display_name` (text): User's display name
      - `avatar_url` (text): User's avatar URL
      - `created_at` (timestamptz): Account creation timestamp
      - `updated_at` (timestamptz): Last update timestamp
      - `last_sign_in` (timestamptz): Last sign in timestamp
      - `provider` (text): Authentication provider (email, google, github)

    - `projects`: Store project information
      - `id` (uuid, primary key): Project's unique identifier
      - `owner_id` (uuid): Reference to users.id
      - `name_en` (text): Project name in English
      - `name_zh` (text): Project name in Chinese
      - `description_en` (text): Project description in English
      - `description_zh` (text): Project description in Chinese
      - `created_at` (timestamptz): Creation timestamp
      - `updated_at` (timestamptz): Last update timestamp

    - `template_categories`: Store template category information
      - `id` (uuid, primary key): Category's unique identifier
      - `parent_id` (uuid): Reference to parent category (for subcategories)
      - `name_en` (text): Category name in English
      - `name_zh` (text): Category name in Chinese
      - `description_en` (text): Category description in English
      - `description_zh` (text): Category description in Chinese
      - `created_at` (timestamptz): Creation timestamp
      - `updated_at` (timestamptz): Last update timestamp

    - `templates`: Store template information
      - `id` (uuid, primary key): Template's unique identifier
      - `category_id` (uuid): Reference to template_categories.id
      - `name_en` (text): Template name in English
      - `name_zh` (text): Template name in Chinese
      - `description_en` (text): Template description in English
      - `description_zh` (text): Template description in Chinese
      - `prompt_content` (text): Template prompt content
      - `created_at` (timestamptz): Creation timestamp
      - `updated_at` (timestamptz): Last update timestamp

    - `project_analyses`: Store project analysis results
      - `id` (uuid, primary key): Analysis unique identifier
      - `project_id` (uuid): Reference to projects.id
      - `template_id` (uuid): Reference to templates.id
      - `input_content` (text): User input content
      - `output_content` (text): Generated analysis output
      - `created_at` (timestamptz): Creation timestamp
      - `updated_at` (timestamptz): Last update timestamp

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to:
      - Read and manage their own projects
      - Read template categories and templates
      - Read and manage their own project analyses
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  email text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  provider text NOT NULL DEFAULT 'email',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_sign_in timestamptz DEFAULT now()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name_en text NOT NULL,
  name_zh text NOT NULL,
  description_en text,
  description_zh text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create template categories table
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

-- Create templates table
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

-- Create project analyses table
CREATE TABLE IF NOT EXISTS project_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  input_content text NOT NULL,
  output_content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_analyses ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can read own data" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- Create policies for projects table
CREATE POLICY "Users can read own projects" ON projects
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own projects" ON projects
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- Create policies for template_categories table
CREATE POLICY "Anyone can read template categories" ON template_categories
  FOR SELECT TO authenticated
  USING (true);

-- Create policies for templates table
CREATE POLICY "Anyone can read templates" ON templates
  FOR SELECT TO authenticated
  USING (true);

-- Create policies for project_analyses table
CREATE POLICY "Users can read own project analyses" ON project_analyses
  FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own project analyses" ON project_analyses
  FOR INSERT TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own project analyses" ON project_analyses
  FOR UPDATE TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own project analyses" ON project_analyses
  FOR DELETE TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_categories_updated_at
  BEFORE UPDATE ON template_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_analyses_updated_at
  BEFORE UPDATE ON project_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();