/*
  # 完整数据库架构和初始数据

  1. 表结构
    - users: 用户信息表
    - user_projects: 用户项目表
    - template_categories: 模板分类表
    - templates: 模板定义表
    - template_versions: 模板版本表
    - verification_codes: 验证码表
    - generation_tasks: 生成任务表

  2. 功能说明
    - 完整的用户和项目管理
    - 模板分类和版本控制
    - 验证码和任务管理
    - 自动更新时间戳
    - 行级安全策略
*/

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  provider text NOT NULL DEFAULT 'email',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_sign_in timestamptz DEFAULT now()
);

-- 创建用户项目表
CREATE TABLE IF NOT EXISTS user_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_default boolean NOT NULL DEFAULT false,
  is_open_source boolean NOT NULL DEFAULT false,
  model_locked boolean NOT NULL DEFAULT false
);

-- 创建模板分类表
CREATE TABLE IF NOT EXISTS template_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES template_categories(id),
  name_en text NOT NULL,
  name_zh text NOT NULL,
  description_en text,
  description_zh text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  no integer NOT NULL DEFAULT 1
);

-- 创建模板表
CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES template_categories(id) ON DELETE CASCADE,
  name_en text NOT NULL,
  name_zh text NOT NULL,
  description_en text,
  description_zh text,
  prompt_content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  no integer NOT NULL DEFAULT 1
);

-- 创建模板版本表
CREATE TABLE IF NOT EXISTS template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  is_active boolean NOT NULL DEFAULT false,
  version_number integer NOT NULL DEFAULT 1,
  input_content text DEFAULT '',
  updated_at timestamptz DEFAULT now(),
  project_id uuid REFERENCES user_projects(id) ON DELETE CASCADE,
  output_content jsonb DEFAULT jsonb_build_object('content', '', 'annotations', '[]'::jsonb) NOT NULL
);

-- 创建验证码表
CREATE TABLE IF NOT EXISTS verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 创建生成任务表
CREATE TABLE IF NOT EXISTS generation_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES templates(id),
  project_id uuid NOT NULL REFERENCES user_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  email text NOT NULL,
  input_content text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 启用行级安全性
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_tasks ENABLE ROW LEVEL SECURITY;

-- 创建更新时间戳函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建版本号生成函数
CREATE OR REPLACE FUNCTION generate_template_version_number()
RETURNS TRIGGER AS $$
DECLARE
  latest_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) INTO latest_version
  FROM template_versions
  WHERE template_id = NEW.template_id;
  
  NEW.version_number := latest_version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建模板版本状态管理函数
CREATE OR REPLACE FUNCTION manage_template_version_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE template_versions
    SET is_active = false
    WHERE template_id = NEW.template_id
    AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建默认项目管理函数
CREATE OR REPLACE FUNCTION manage_default_project()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE user_projects
    SET is_default = false
    WHERE user_id = NEW.user_id
    AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建模板输出验证函数
CREATE OR REPLACE FUNCTION validate_template_version_output()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT (NEW.output_content ? 'content' AND NEW.output_content ? 'annotations') THEN
    RAISE EXCEPTION 'output_content must contain content and annotations fields';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_projects_updated_at
  BEFORE UPDATE ON user_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_categories_updated_at
  BEFORE UPDATE ON template_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_versions_updated_at
  BEFORE UPDATE ON template_versions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_verification_codes_updated_at
  BEFORE UPDATE ON verification_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generation_tasks_updated_at
  BEFORE UPDATE ON generation_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_template_version_number
  BEFORE INSERT ON template_versions
  FOR EACH ROW
  EXECUTE FUNCTION generate_template_version_number();

CREATE TRIGGER manage_template_versions
  BEFORE INSERT OR UPDATE OF is_active ON template_versions
  FOR EACH ROW
  EXECUTE FUNCTION manage_template_version_status();

CREATE TRIGGER manage_default_project_trigger
  BEFORE INSERT OR UPDATE OF is_default ON user_projects
  FOR EACH ROW
  EXECUTE FUNCTION manage_default_project();

CREATE TRIGGER ensure_valid_output_content
  BEFORE INSERT OR UPDATE OF output_content ON template_versions
  FOR EACH ROW
  EXECUTE FUNCTION validate_template_version_output();

-- 创建访问策略
CREATE POLICY "Users can read own data" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can manage their own projects" ON user_projects
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can read template categories" ON template_categories
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Anyone can read templates" ON templates
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Anyone can read template versions" ON template_versions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create template versions" ON template_versions
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own template versions" ON template_versions
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own inactive versions" ON template_versions
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() AND is_active = false);

CREATE POLICY "Anyone can create verification codes" ON verification_codes
  FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can verify their own code" ON verification_codes
  FOR SELECT TO public
  USING (
    email = current_setting('request.jwt.claims')::json->>'email'
    AND expires_at > now()
  );

CREATE POLICY "Users can manage their own tasks" ON generation_tasks
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 插入初始模板分类数据
INSERT INTO template_categories (id, name_en, name_zh, description_en, description_zh, no) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Strategy & Vision', '策略与愿景', 'Strategic planning and vision setting', '战略规划和愿景设定', 1),
  ('22222222-2222-2222-2222-222222222222', 'User Research', '用户研究', 'User research and analysis', '用户研究与分析', 2),
  ('33333333-3333-3333-3333-333333333333', 'Product Planning', '产品规划', 'Product planning and requirements', '产品规划与需求', 3),
  ('44444444-4444-4444-4444-444444444444', 'Data & Analysis', '数据分析', 'Data analysis and metrics', '数据分析与指标', 4),
  ('55555555-5555-5555-5555-555555555555', 'Growth & Retention', '增长与留存', 'Growth hacking and user retention', '增长黑客与用户留存', 5),
  ('66666666-6666-6666-6666-666666666666', 'Design & Experience', '设计与体验', 'UX/UI design and user experience', '用户体验与界面设计', 6),
  ('77777777-7777-7777-7777-777777777777', 'Development', '开发', 'Technical planning and documentation', '技术规划与文档', 7);

-- 插入初始模板数据
INSERT INTO templates (category_id, name_en, name_zh, description_en, description_zh, prompt_content, no) VALUES
-- 策略与愿景类
('11111111-1111-1111-1111-111111111111', 'Product Vision Statement', '产品愿景定义', 
'Create a concise vision statement for your product', '为产品创建简洁的愿景声明',
'请根据以下产品信息创建愿景声明：

1. 产品概述
   - 产品名称和类型
   - 目标用户群
   - 核心价值主张

2. 愿景分析
   - 长期目标
   - 市场影响
   - 创新点

3. 实现路径
   - 关键里程碑
   - 潜在挑战
   - 解决方案

请确保输出简洁明了，突出产品的独特价值和长期发展方向。', 1),

('11111111-1111-1111-1111-111111111111', 'Product Value Proposition', '产品价值主张', 
'Craft a clear value proposition that resonates with users', '制定清晰的产品价值主张',
'请根据以下信息制定产品价值主张：

1. 问题定义
   - 用户痛点
   - 现有解决方案的不足
   - 市场机会

2. 解决方案价值
   - 核心功能
   - 创新点
   - 竞争优势

3. 用户价值
   - 主要受益点
   - 使用场景
   - 预期效果

请确保价值主张清晰有力，能引起目标用户的共鸣。', 2);

-- 为每个模板创建初始版本
INSERT INTO template_versions (template_id, created_by, is_active, input_content, output_content)
SELECT 
  t.id,
  auth.uid(),
  true,
  t.prompt_content,
  jsonb_build_object(
    'content', '',
    'annotations', '[]'::jsonb
  )
FROM templates t;