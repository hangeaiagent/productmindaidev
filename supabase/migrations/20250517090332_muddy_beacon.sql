/*
  # 更新模板版本表结构
  
  1. 添加字段
    - input_content: 用于存储输入内容
    - output_content: 用于存储生成的输出内容
    
  2. 更新访问策略
    - 允许用户读取和管理自己的模板版本
*/

-- 添加新字段
ALTER TABLE template_versions
ADD COLUMN IF NOT EXISTS input_content text,
ADD COLUMN IF NOT EXISTS output_content text;

-- 更新访问策略
DROP POLICY IF EXISTS "Users can update their own template versions" ON template_versions;
CREATE POLICY "Users can update their own template versions"
  ON template_versions
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- 更新插入策略
DROP POLICY IF EXISTS "Authenticated users can create template versions" ON template_versions;
CREATE POLICY "Authenticated users can create template versions"
  ON template_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);