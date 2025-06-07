-- 为templates表添加mdcprompt字段
ALTER TABLE templates
ADD COLUMN mdcprompt text;

COMMENT ON COLUMN templates.mdcprompt IS '用于生成cursor规则文件的提示词模板';

-- 为template_versions表添加mdcpromptcontent相关字段
ALTER TABLE template_versions
ADD COLUMN mdcpromptcontent_zh text,
ADD COLUMN mdcpromptcontent_en text;

COMMENT ON COLUMN template_versions.mdcpromptcontent_zh IS 'cursor规则文件的中文内容';
COMMENT ON COLUMN template_versions.mdcpromptcontent_en IS 'cursor规则文件的英文内容';

-- 更新现有记录的默认值
UPDATE template_versions
SET 
  mdcpromptcontent_zh = '',
  mdcpromptcontent_en = ''
WHERE mdcpromptcontent_zh IS NULL
   OR mdcpromptcontent_en IS NULL; 