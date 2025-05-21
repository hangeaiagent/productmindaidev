/*
  # 添加分析版本管理功能

  1. 更新 project_analyses 表
    - 添加 version_number 字段
    - 添加 is_active 字段标记当前活动版本
    - 添加 parent_id 字段关联原始分析

  2. 功能说明
    - 每次生成新的分析结果时自动创建新版本
    - 通过 parent_id 关联同一分析的不同版本
    - version_number 自动递增
    - is_active 标记当前使用的版本
*/

-- 添加版本相关字段
ALTER TABLE project_analyses
ADD COLUMN IF NOT EXISTS version_number INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES project_analyses(id);

-- 创建版本号生成函数
CREATE OR REPLACE FUNCTION generate_analysis_version_number()
RETURNS TRIGGER AS $$
DECLARE
  latest_version INTEGER;
BEGIN
  -- 如果有 parent_id，查找同组最大版本号
  IF NEW.parent_id IS NOT NULL THEN
    SELECT COALESCE(MAX(version_number), 0) INTO latest_version
    FROM project_analyses
    WHERE id = NEW.parent_id OR parent_id = NEW.parent_id;
    
    NEW.version_number := latest_version + 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建版本号生成触发器
CREATE TRIGGER set_analysis_version_number
  BEFORE INSERT ON project_analyses
  FOR EACH ROW
  EXECUTE FUNCTION generate_analysis_version_number();

-- 创建版本状态管理函数
CREATE OR REPLACE FUNCTION manage_analysis_version_status()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果设置新版本为活动状态，将同组其他版本设为非活动
  IF NEW.is_active = true AND (NEW.parent_id IS NOT NULL OR EXISTS (
    SELECT 1 FROM project_analyses WHERE parent_id = NEW.id
  )) THEN
    UPDATE project_analyses
    SET is_active = false
    WHERE (id = NEW.parent_id OR parent_id = NEW.parent_id OR id IN (
      SELECT id FROM project_analyses WHERE parent_id = NEW.id
    ))
    AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建版本状态管理触发器
CREATE TRIGGER manage_analysis_versions
  BEFORE INSERT OR UPDATE OF is_active ON project_analyses
  FOR EACH ROW
  EXECUTE FUNCTION manage_analysis_version_status();

-- 更新现有记录
UPDATE project_analyses
SET version_number = 1,
    is_active = true
WHERE version_number IS NULL;