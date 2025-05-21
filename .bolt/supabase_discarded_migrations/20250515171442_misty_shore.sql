/*
  # 简化项目表结构

  1. 更改
    - 将多语言字段合并为单一字段
    - 保留现有数据
    - 确保数据完整性
*/

-- 将现有数据迁移到临时列
ALTER TABLE user_projects
ADD COLUMN temp_name text,
ADD COLUMN temp_description text;

UPDATE user_projects
SET 
  temp_name = COALESCE(name_zh, name_en),
  temp_description = COALESCE(description_zh, description_en);

-- 删除旧列
ALTER TABLE user_projects
DROP COLUMN name_zh,
DROP COLUMN name_en,
DROP COLUMN description_zh,
DROP COLUMN description_en;

-- 重命名临时列为最终列名
ALTER TABLE user_projects
RENAME COLUMN temp_name TO name;

ALTER TABLE user_projects
RENAME COLUMN temp_description TO description;

-- 设置非空约束
ALTER TABLE user_projects
ALTER COLUMN name SET NOT NULL;