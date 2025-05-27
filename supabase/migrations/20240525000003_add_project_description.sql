-- 添加项目描述字段
ALTER TABLE ai_funding
  ADD COLUMN project_description TEXT;  -- 项目功能说明

-- 创建全文搜索索引
CREATE INDEX idx_ai_funding_project_description ON ai_funding USING gin(to_tsvector('english', project_description)); 