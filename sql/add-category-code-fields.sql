-- ===========================================
-- 为 user_projects 表添加分类编码字段
-- ===========================================

-- 添加主分类编码字段
ALTER TABLE user_projects 
ADD COLUMN primary_category_code VARCHAR(10);

-- 添加次分类编码字段  
ALTER TABLE user_projects 
ADD COLUMN secondary_category_code VARCHAR(10);

-- 为新字段添加索引以提高查询性能
CREATE INDEX idx_user_projects_primary_category_code ON user_projects(primary_category_code);
CREATE INDEX idx_user_projects_secondary_category_code ON user_projects(secondary_category_code);

-- 添加外键约束（可选，与分类表建立关联）
-- 注意：只有在 user_projectscategory 表已存在且有数据时才能添加外键约束
-- ALTER TABLE user_projects 
-- ADD CONSTRAINT fk_primary_category_code 
-- FOREIGN KEY (primary_category_code) REFERENCES user_projectscategory(category_code);

-- ALTER TABLE user_projects 
-- ADD CONSTRAINT fk_secondary_category_code 
-- FOREIGN KEY (secondary_category_code) REFERENCES user_projectscategory(category_code);

-- ===========================================
-- 字段说明
-- ===========================================
-- primary_category_code: 主分类编码，对应一级分类 (如: 10, 20, 30...)
-- secondary_category_code: 次分类编码，对应二级分类 (如: 1010, 1020, 2010...)

-- ===========================================
-- 验证字段是否添加成功
-- ===========================================
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'user_projects' 
-- AND column_name IN ('primary_category_code', 'secondary_category_code'); 