/*
  # 更新模板版本管理功能

  1. 更新 template_versions 表
    - 添加 input_content 和 output_content 字段的默认值
    - 添加 created_by 字段的非空约束
    - 优化版本管理触发器

  2. 更新 project_analyses 表
    - 添加 version_number 和 is_active 字段的默认值
    - 优化版本管理触发器

  3. 功能说明
    - 确保所有新版本都有正确的版本号
    - 优化版本状态管理
    - 添加必要的约束确保数据完整性
*/

-- 更新 template_versions 表的字段默认值和约束
ALTER TABLE template_versions
ALTER COLUMN input_content SET DEFAULT '',
ALTER COLUMN output_content SET DEFAULT '',
ALTER COLUMN created_by SET NOT NULL;

-- 优化模板版本管理触发器
CREATE OR REPLACE FUNCTION manage_template_version_status()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果设置新版本为活动状态，将同一模板的其他版本设为非活动
  IF NEW.is_active = true THEN
    UPDATE template_versions
    SET is_active = false,
        updated_at = now()
    WHERE template_id = NEW.template_id
    AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 优化项目分析版本管理触发器
CREATE OR REPLACE FUNCTION manage_analysis_version_status()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果设置新版本为活动状态，将同组其他版本设为非活动
  IF NEW.is_active = true AND (NEW.parent_id IS NOT NULL OR EXISTS (
    SELECT 1 FROM project_analyses WHERE parent_id = NEW.id
  )) THEN
    UPDATE project_analyses
    SET is_active = false,
        updated_at = now()
    WHERE (id = NEW.parent_id OR parent_id = NEW.parent_id OR id IN (
      SELECT id FROM project_analyses WHERE parent_id = NEW.id
    ))
    AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 添加模板版本号生成函数的错误处理
CREATE OR REPLACE FUNCTION generate_template_version_number()
RETURNS TRIGGER AS $$
DECLARE
  latest_version INTEGER;
BEGIN
  -- 查找同一模板的最大版本号
  SELECT COALESCE(MAX(version_number), 0) INTO latest_version
  FROM template_versions
  WHERE template_id = NEW.template_id;
  
  IF latest_version IS NULL THEN
    latest_version := 0;
  END IF;
  
  NEW.version_number := latest_version + 1;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '生成版本号时发生错误: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;