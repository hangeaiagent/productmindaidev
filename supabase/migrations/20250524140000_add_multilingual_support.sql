/*
  # 添加多语言支持

  1. 修改 user_projects 表添加多语言字段
  2. 修改 template_versions 表添加多语言输出内容
  3. 更新相关验证函数
  4. 迁移现有数据
*/

-- 修改 user_projects 表添加多语言支持
ALTER TABLE user_projects
ADD COLUMN IF NOT EXISTS name_zh text,
ADD COLUMN IF NOT EXISTS name_en text,
ADD COLUMN IF NOT EXISTS description_zh text,
ADD COLUMN IF NOT EXISTS description_en text,
ADD COLUMN IF NOT EXISTS source_language text CHECK (source_language IN ('zh', 'en'));

-- 更新现有数据（将现有的 name 和 description 作为中文内容）
UPDATE user_projects
SET name_zh = COALESCE(name_zh, name),
    name_en = COALESCE(name_en, name),
    description_zh = COALESCE(description_zh, description),
    description_en = COALESCE(description_en, description),
    source_language = COALESCE(source_language, 'zh')
WHERE name_zh IS NULL OR name_en IS NULL;

-- 修改 template_versions 表添加多语言输出内容
ALTER TABLE template_versions
ADD COLUMN IF NOT EXISTS output_content_zh jsonb DEFAULT jsonb_build_object('content', '', 'annotations', '[]'::jsonb),
ADD COLUMN IF NOT EXISTS output_content_en jsonb DEFAULT jsonb_build_object('content', '', 'annotations', '[]'::jsonb),
ADD COLUMN IF NOT EXISTS source_language text CHECK (source_language IN ('zh', 'en'));

-- 更新现有数据（将现有的 output_content 作为中文内容）
UPDATE template_versions
SET output_content_zh = COALESCE(output_content_zh, output_content),
    output_content_en = COALESCE(output_content_en, output_content),
    source_language = COALESCE(source_language, 'zh')
WHERE output_content_zh IS NULL OR output_content_en IS NULL;

-- 修改输出内容验证函数
CREATE OR REPLACE FUNCTION validate_template_version_output()
RETURNS TRIGGER AS $$
BEGIN
  -- 验证主输出内容
  IF NOT (NEW.output_content ? 'content' AND NEW.output_content ? 'annotations') THEN
    RAISE EXCEPTION 'output_content must contain content and annotations fields';
  END IF;
  
  -- 验证中文输出内容（如果存在）
  IF NEW.output_content_zh IS NOT NULL AND NOT (NEW.output_content_zh ? 'content' AND NEW.output_content_zh ? 'annotations') THEN
    RAISE EXCEPTION 'output_content_zh must contain content and annotations fields';
  END IF;
  
  -- 验证英文输出内容（如果存在）
  IF NEW.output_content_en IS NOT NULL AND NOT (NEW.output_content_en ? 'content' AND NEW.output_content_en ? 'annotations') THEN
    RAISE EXCEPTION 'output_content_en must contain content and annotations fields';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建语言检测辅助函数
CREATE OR REPLACE FUNCTION detect_text_language(text_content text)
RETURNS text AS $$
BEGIN
  -- 简单的语言检测逻辑：检查是否包含中文字符
  IF text_content ~ '[\u4e00-\u9fff]' THEN
    RETURN 'zh';
  ELSE
    RETURN 'en';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_user_projects_source_language ON user_projects(source_language);
CREATE INDEX IF NOT EXISTS idx_template_versions_source_language ON template_versions(source_language);
CREATE INDEX IF NOT EXISTS idx_user_projects_name_zh ON user_projects USING gin(to_tsvector('simple', name_zh));
CREATE INDEX IF NOT EXISTS idx_user_projects_name_en ON user_projects USING gin(to_tsvector('english', name_en)); 