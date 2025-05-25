-- 更新 ai_funding 表结构
ALTER TABLE ai_funding
  ADD COLUMN company_info TEXT,           -- 公司基本信息
  ADD COLUMN funding_info TEXT,           -- 融资情况说明
  ADD COLUMN company_website VARCHAR(512), -- 公司官网
  ADD COLUMN funding_amount VARCHAR(100),  -- 融资金额
  ADD COLUMN funding_round VARCHAR(50),    -- 融资轮次
  ADD COLUMN funding_date DATE,           -- 融资日期
  ADD COLUMN investors TEXT[],            -- 投资方（数组）
  ADD COLUMN company_location VARCHAR(100), -- 公司所在地
  ADD COLUMN industry_tags TEXT[],        -- 行业标签
  ADD COLUMN employee_count VARCHAR(50),   -- 员工规模
  ADD COLUMN founding_date DATE;          -- 成立日期

-- 创建索引
CREATE INDEX idx_ai_funding_funding_date ON ai_funding(funding_date);
CREATE INDEX idx_ai_funding_company_name ON ai_funding(project_name);
CREATE INDEX idx_ai_funding_industry_tags ON ai_funding USING GIN(industry_tags);

-- 更新现有记录
UPDATE ai_funding
SET company_info = description,
    description = NULL
WHERE description IS NOT NULL; 