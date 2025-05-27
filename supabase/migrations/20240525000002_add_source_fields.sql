-- 添加新的字段到 ai_funding 表
ALTER TABLE ai_funding
  ADD COLUMN source_name VARCHAR(100),       -- 来源网站名称
  ADD COLUMN source_title TEXT,              -- 原文标题
  ADD COLUMN source_date DATE,               -- 新闻日期
  ADD COLUMN processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;  -- 处理时间

-- 更新现有记录的处理时间
UPDATE ai_funding
SET processed_at = created_at
WHERE processed_at IS NULL;

-- 添加索引以提高查询性能
CREATE INDEX idx_ai_funding_source_name ON ai_funding(source_name);
CREATE INDEX idx_ai_funding_source_date ON ai_funding(source_date);
CREATE INDEX idx_ai_funding_processed_at ON ai_funding(processed_at); 