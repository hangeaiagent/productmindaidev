/*
  # 更新项目表结构

  1. 修改
    - 添加多语言支持字段
    - 保持向后兼容性
    - 确保数据完整性

  2. 变更
    - 为 user_projects 表添加多语言字段
    - 设置默认值和约束
*/

-- 添加多语言字段
ALTER TABLE user_projects
ADD COLUMN name_zh text,
ADD COLUMN name_en text,
ADD COLUMN description_zh text,
ADD COLUMN description_en text;

-- 将现有数据复制到新字段
UPDATE user_projects
SET 
  name_zh = name,
  name_en = name,
  description_zh = description,
  description_en = description;

-- 设置非空约束
ALTER TABLE user_projects
ALTER COLUMN name_zh SET NOT NULL,
ALTER COLUMN name_en SET NOT NULL;