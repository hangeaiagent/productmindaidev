/*
  # 添加官方网站和产品描述字段

  1. 修改 user_projects 表添加官方网站字段
  2. 修改 user_projects 表添加产品描述字段
*/

-- 修改 user_projects 表添加官方网站字段
ALTER TABLE user_projects
ADD COLUMN IF NOT EXISTS official_website text,
ADD COLUMN IF NOT EXISTS product_description_zh text,
ADD COLUMN IF NOT EXISTS product_description_en text;

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_user_projects_official_website ON user_projects(official_website);
CREATE INDEX IF NOT EXISTS idx_user_projects_product_description_zh ON user_projects USING gin(to_tsvector('simple', product_description_zh));
CREATE INDEX IF NOT EXISTS idx_user_projects_product_description_en ON user_projects USING gin(to_tsvector('english', product_description_en)); 