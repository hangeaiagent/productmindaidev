/*
  # 移除认证并简化数据库结构

  1. 更改
    - 移除 RLS (Row Level Security) 策略
    - 移除用户表和项目表
    - 保留模板相关表并允许公开访问
  
  2. 安全性
    - 模板表和分类表设置为公开可读
*/

-- 删除现有表和策略
DROP TABLE IF EXISTS project_analyses;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;

DROP TABLE IF EXISTS template_categories;

DROP TABLE IF EXISTS templates;

-- 重新创建模板分类表
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

-- 重新创建模板表
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

-- 创建或更新 updated_at 触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建触发器
CREATE TRIGGER update_template_categories_updated_at
  BEFORE UPDATE ON template_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 设置公开访问权限
ALTER TABLE template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允许公开读取模板分类"
  ON template_categories
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "允许公开读取模板"
  ON templates
  FOR SELECT
  TO PUBLIC
  USING (true);