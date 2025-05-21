/*
  # 添加模板版本管理功能

  1. 新增表
    - `template_versions`: 存储模板的版本历史
      - `id` (uuid): 版本ID
      - `template_id` (uuid): 关联的模板ID
      - `prompt_content` (text): 模板内容
      - `created_at` (timestamptz): 创建时间
      - `created_by` (uuid): 创建者ID
      - `is_active` (boolean): 是否为当前活动版本
      - `version_number` (integer): 版本号

  2. 安全设置
    - 启用 RLS
    - 添加访问策略
*/

-- 创建模板版本表
CREATE TABLE IF NOT EXISTS template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  prompt_content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  is_active boolean DEFAULT false,
  version_number integer NOT NULL,
  UNIQUE(template_id, version_number)
);

-- 启用行级安全性
ALTER TABLE template_versions ENABLE ROW LEVEL_SECURITY;

-- 创建访问策略
CREATE POLICY "Anyone can read template versions" ON template_versions
  FOR SELECT TO authenticated
  USING (true);

-- 创建触发器函数，用于自动生成版本号
CREATE OR REPLACE FUNCTION generate_template_version_number()
RETURNS TRIGGER AS $$
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO NEW.version_number
  FROM template_versions
  WHERE template_id = NEW.template_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER set_template_version_number
  BEFORE INSERT ON template_versions
  FOR EACH ROW
  EXECUTE FUNCTION generate_template_version_number();

-- 迁移现有模板内容到版本表
INSERT INTO template_versions (template_id, prompt_content, created_by, is_active, version_number)
SELECT 
  id as template_id,
  prompt_content,
  NULL as created_by,
  true as is_active,
  1 as version_number
FROM templates;