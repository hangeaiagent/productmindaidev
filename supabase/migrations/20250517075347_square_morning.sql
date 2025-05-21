/*
  # 添加模板版本管理功能

  1. 新增表
    - `template_versions`: 模板版本表
      - `id` (uuid): 版本ID
      - `template_id` (uuid): 关联的模板ID
      - `prompt_content` (text): 提示词内容
      - `created_at` (timestamptz): 创建时间
      - `created_by` (uuid): 创建者ID
      - `is_active` (boolean): 是否为当前活动版本
      - `version_number` (integer): 版本号

  2. 功能说明
    - 每个模板可以有多个版本
    - 通过 is_active 标记当前使用的版本
    - version_number 自动递增
    - 只能有一个活动版本

  3. 安全设置
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
  is_active boolean NOT NULL DEFAULT false,
  version_number integer NOT NULL DEFAULT 1
);

-- 启用行级安全性
ALTER TABLE template_versions ENABLE ROW LEVEL SECURITY;

-- 创建版本号生成函数
CREATE OR REPLACE FUNCTION generate_template_version_number()
RETURNS TRIGGER AS $$
DECLARE
  latest_version INTEGER;
BEGIN
  -- 查找同一模板的最大版本号
  SELECT COALESCE(MAX(version_number), 0) INTO latest_version
  FROM template_versions
  WHERE template_id = NEW.template_id;
  
  NEW.version_number := latest_version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建版本号生成触发器
CREATE TRIGGER set_template_version_number
  BEFORE INSERT ON template_versions
  FOR EACH ROW
  EXECUTE FUNCTION generate_template_version_number();

-- 创建版本状态管理函数
CREATE OR REPLACE FUNCTION manage_template_version_status()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果设置新版本为活动状态，将同一模板的其他版本设为非活动
  IF NEW.is_active = true THEN
    UPDATE template_versions
    SET is_active = false
    WHERE template_id = NEW.template_id
    AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建版本状态管理触发器
CREATE TRIGGER manage_template_versions
  BEFORE INSERT OR UPDATE OF is_active ON template_versions
  FOR EACH ROW
  EXECUTE FUNCTION manage_template_version_status();

-- 创建访问策略
CREATE POLICY "Anyone can read template versions"
  ON template_versions
  FOR SELECT
  TO authenticated
  USING (true);

-- 将现有模板内容迁移到版本表
INSERT INTO template_versions (template_id, prompt_content, is_active)
SELECT id, prompt_content, true
FROM templates;