/*
  # 添加模板版本的访问策略

  1. 新增策略
    - 允许已认证用户创建模板版本
    - 允许已认证用户读取模板版本
    - 允许已认证用户更新自己创建的模板版本
    - 允许已认证用户删除自己创建的非活动版本

  2. 说明
    - 所有用户都可以读取模板版本
    - 只有已认证用户可以创建新版本
    - 用户只能更新和删除自己创建的版本
    - 活动版本不允许删除
*/

-- 创建插入策略
CREATE POLICY "Authenticated users can create template versions"
  ON template_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 创建更新策略
CREATE POLICY "Users can update their own template versions"
  ON template_versions
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- 创建删除策略
CREATE POLICY "Users can delete their own inactive template versions"
  ON template_versions
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() 
    AND is_active = false
  );