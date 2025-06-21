-- 为template_versions表添加HTML文件路径字段
-- 执行前请确保连接到正确的数据库

-- 添加中文HTML文件路径字段
ALTER TABLE template_versions ADD COLUMN IF NOT EXISTS cnhtmlpath text;

-- 添加英文HTML文件路径字段  
ALTER TABLE template_versions ADD COLUMN IF NOT EXISTS enhtmlpath text;

-- 为字段添加注释
COMMENT ON COLUMN template_versions.cnhtmlpath IS '中文HTML文件相对路径';
COMMENT ON COLUMN template_versions.enhtmlpath IS '英文HTML文件相对路径';

-- 查看表结构确认字段已添加
\d template_versions; 