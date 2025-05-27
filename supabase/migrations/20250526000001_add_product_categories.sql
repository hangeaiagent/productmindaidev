/*
  # 添加产品分类字段和重复检查功能

  1. 修改 user_projects 表添加分类字段
  2. 添加唯一约束防止重复产品名称
  3. 创建分类相关索引
*/

-- 修改 user_projects 表添加分类字段
ALTER TABLE user_projects
ADD COLUMN IF NOT EXISTS primary_category text,
ADD COLUMN IF NOT EXISTS secondary_category text,
ADD COLUMN IF NOT EXISTS category_path text;

-- 创建唯一约束防止重复产品名称（同一用户下）
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_projects_unique_name 
ON user_projects(user_id, LOWER(name)) 
WHERE name IS NOT NULL;

-- 创建分类相关索引
CREATE INDEX IF NOT EXISTS idx_user_projects_primary_category ON user_projects(primary_category);
CREATE INDEX IF NOT EXISTS idx_user_projects_secondary_category ON user_projects(secondary_category);
CREATE INDEX IF NOT EXISTS idx_user_projects_category_path ON user_projects(category_path);

-- 创建函数检查产品名称重复
CREATE OR REPLACE FUNCTION check_duplicate_product_name()
RETURNS TRIGGER AS $$
BEGIN
  -- 检查是否存在相同名称的产品（忽略大小写）
  IF EXISTS (
    SELECT 1 FROM user_projects 
    WHERE user_id = NEW.user_id 
    AND LOWER(name) = LOWER(NEW.name)
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION '产品名称 "%" 已存在，请使用不同的名称', NEW.name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER check_duplicate_product_name_trigger
  BEFORE INSERT OR UPDATE OF name ON user_projects
  FOR EACH ROW
  EXECUTE FUNCTION check_duplicate_product_name();

-- 添加注释
COMMENT ON COLUMN user_projects.primary_category IS '产品一级分类';
COMMENT ON COLUMN user_projects.secondary_category IS '产品二级分类';
COMMENT ON COLUMN user_projects.category_path IS '完整分类路径，格式：一级分类/二级分类'; 