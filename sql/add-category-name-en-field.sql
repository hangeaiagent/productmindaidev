-- ===========================================
-- 为 user_projectscategory 表添加英文分类名称字段
-- ===========================================

-- 添加英文分类名称字段
ALTER TABLE user_projectscategory 
ADD COLUMN IF NOT EXISTS category_name_en VARCHAR(100);

-- 为新字段添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_user_projectscategory_name_en ON user_projectscategory(category_name_en);

-- 添加注释
COMMENT ON COLUMN user_projectscategory.category_name_en IS '分类英文名称';

-- ===========================================
-- 验证字段是否添加成功
-- ===========================================
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'user_projectscategory' 
-- AND column_name = 'category_name_en'; 