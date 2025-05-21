/*
  # 移除 prompt_content 字段
  
  1. 变更说明
    - 从 template_versions 表中移除 prompt_content 字段
    - input_content 字段已经包含了原 prompt_content 的功能
    
  2. 数据迁移
    - 将现有的 prompt_content 内容迁移到 input_content
    - 仅对 input_content 为空的记录进行迁移
*/

-- 将 prompt_content 内容迁移到 input_content
UPDATE template_versions
SET input_content = prompt_content
WHERE input_content IS NULL;

-- 移除 prompt_content 字段
ALTER TABLE template_versions
DROP COLUMN IF EXISTS prompt_content;