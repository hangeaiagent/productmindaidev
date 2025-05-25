-- 修改字段长度限制
ALTER TABLE ai_funding
  ALTER COLUMN funding_amount TYPE VARCHAR(255),
  ALTER COLUMN funding_round TYPE VARCHAR(255),
  ALTER COLUMN company_location TYPE VARCHAR(255),
  ALTER COLUMN employee_count TYPE VARCHAR(255);

-- 为了安全起见，增加一些字段的非空约束
ALTER TABLE ai_funding
  ALTER COLUMN project_name SET NOT NULL,
  ALTER COLUMN source_url SET NOT NULL; 