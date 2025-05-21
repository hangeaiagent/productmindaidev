/*
  # 添加项目管理相关表

  1. 新增表
    - `user_projects`: 用户项目表
      - `id` (uuid): 项目ID
      - `user_id` (uuid): 用户ID
      - `name` (text): 项目名称
      - `description` (text): 项目描述
      - `created_at` (timestamptz): 创建时间
      - `updated_at` (timestamptz): 更新时间
      
    - `project_analyses`: 项目分析记录表
      - `id` (uuid): 记录ID
      - `project_id` (uuid): 项目ID
      - `template_id` (uuid): 使用的模板ID
      - `input_content` (text): 输入内容
      - `output_content` (text): 分析结果
      - `created_at` (timestamptz): 创建时间
      - `updated_at` (timestamptz): 更新时间

  2. 安全设置
    - 启用 RLS
    - 添加用户访问策略
*/

-- 创建用户项目表
CREATE TABLE IF NOT EXISTS user_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 创建项目分析记录表
CREATE TABLE IF NOT EXISTS project_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES user_projects(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES templates(id),
  input_content text NOT NULL,
  output_content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 启用行级安全性
ALTER TABLE user_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_analyses ENABLE ROW LEVEL SECURITY;

-- 创建访问策略
CREATE POLICY "Users can manage their own projects"
  ON user_projects
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage their project analyses"
  ON project_analyses
  FOR ALL
  TO authenticated
  USING (project_id IN (
    SELECT id FROM user_projects WHERE user_id = auth.uid()
  ))
  WITH CHECK (project_id IN (
    SELECT id FROM user_projects WHERE user_id = auth.uid()
  ));

-- 创建更新时间触发器
CREATE TRIGGER update_user_projects_updated_at
  BEFORE UPDATE ON user_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_analyses_updated_at
  BEFORE UPDATE ON project_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();