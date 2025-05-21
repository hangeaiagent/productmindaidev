/*
  # 更新项目表结构

  1. 修改
    - 移除多语言字段
    - 使用单一的 name 和 description 字段
    - 保持数据完整性
*/

-- 创建临时列
ALTER TABLE user_projects
ADD COLUMN temp_name text,
ADD COLUMN temp_description text;

-- 将现有数据迁移到临时列
UPDATE user_projects
SET 
  temp_name = COALESCE(name, name_zh, name_en, ''),
  temp_description = COALESCE(description, description_zh, description_en, '');

-- 删除旧列
ALTER TABLE user_projects
DROP COLUMN IF EXISTS name_zh,
DROP COLUMN IF EXISTS name_en,
DROP COLUMN IF EXISTS description_zh,
DROP COLUMN IF EXISTS description_en;

-- 重命名临时列为最终列名
ALTER TABLE user_projects
RENAME COLUMN temp_name TO name;

ALTER TABLE user_projects
RENAME COLUMN temp_description TO description;

-- 设置非空约束
ALTER TABLE user_projects
ALTER COLUMN name SET NOT NULL;