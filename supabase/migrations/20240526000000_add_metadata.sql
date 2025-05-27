-- 添加 metadata 字段到 ai_funding 表
ALTER TABLE ai_funding
  ADD COLUMN metadata JSONB;  -- 使用JSONB类型存储AI分析元数据

-- 创建索引以支持JSON查询
CREATE INDEX idx_ai_funding_metadata ON ai_funding USING GIN(metadata);

-- 添加注释
COMMENT ON COLUMN ai_funding.metadata IS 'AI分析元数据，包含置信度、处理时间等信息';

-- 更新现有记录
UPDATE ai_funding
SET metadata = '{}'::jsonb
WHERE metadata IS NULL; 