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
I INSERT INTO  "templates" ("id", "category_id", "name_en", "name_zh", "description_en", "description_zh", "prompt_content", "created_at", "updated_at", "no") VALUES ('0346ed34-aa1a-4727-b1a5-2e4b86114568', '11111111-1111-1111-1111-111111111111', 'Market Trend Analysis', '市场趋势预测', 'Analyze and predict market trends', '分析和预测市场趋势', 'Please analyze market trends considering:

1. Current Market State
   - Market size
   - Key players
   - Growth rate

2. Trend Analysis
   - Emerging trends
   - Technology impact
   - User behavior changes

3. Future Predictions
   - Growth opportunities
   - Potential challenges
   - Market evolution', '2025-05-14 11:13:46.537628+00', '2025-05-19 11:51:52.204771+00', '1'), ('0a6f134b-44f0-496b-b396-04ba2c9daa96', '11111111-1111-1111-1111-111111111111', 'Competitor Analysis', '竞品分析报告', 'Generate a comprehensive competitor analysis report', '生成全面的竞品分析报告', 'Please analyze competitors focusing on:

1. Market Position
   - Direct competitors
   - Indirect competitors
   - Market share

2. Product Comparison
   - Feature comparison
   - Pricing analysis
   - User experience

3. SWOT Analysis
   - Strengths
   - Weaknesses
   - Opportunities
   - Threats', '2025-05-14 11:13:46.537628+00', '2025-05-19 11:51:03.976398+00', '2'), ('0fe696d9-bbf1-4b44-af78-68fc5ff1dc25', '77777777-7777-7777-7777-777777777777', 'Product Terminology Guide', '产品术语表创建', 'Create a glossary of terms for your product', '创建产品术语表及定义', 'Please create a terminology guide including:

1. Term Categories
   - Technical terms
   - Business terms
   - User-facing terms

2. Term Definitions
   - Clear explanations
   - Usage examples
   - Context notes

3. Maintenance Plan
   - Update process
   - Review schedule
   - Version control', '2025-05-14 11:13:46.537628+00', '2025-05-16 15:09:40.792369+00', '4'), ('1200247a-394b-464c-b2d3-20a81ce2ede0', '55555555-5555-5555-5555-555555555555', 'Product Metrics Definition', '产品核心指标', 'Define key metrics for product success', '定义产品成功的关键指标', 'Please define key product metrics including:

1. User Metrics
   - Acquisition metrics
   - Engagement metrics
   - Retention metrics

2. Business Metrics
   - Revenue metrics
   - Growth metrics
   - Efficiency metrics

3. Product Health Metrics
   - Performance metrics
   - Quality metrics
   - Support metrics', '2025-05-14 11:13:46.537628+00', '2025-05-19 11:52:22.145587+00', '3'), ('1d3dc327-8d15-40f9-9f7a-6c8ce4813d85', '66666666-6666-6666-6666-666666666666', 'Dashboard Design', '数据看板设计', 'Design a data dashboard with key metrics', '设计包含关键指标的数据看板', 'Please design a dashboard that includes:

1. Metric Selection
   - Key metrics
   - Secondary metrics
   - Custom metrics

2. Layout Design
   - Information hierarchy
   - Visual organization
   - Interactive elements

3. Implementation Guide
   - Technical requirements
   - Data sources
   - Update frequency', '2025-05-14 11:13:46.537628+00', '2025-05-16 15:09:40.792369+00', '2'), ('1ee2afb6-8292-4738-9f01-c3db9010dce1', '66666666-6666-6666-6666-666666666666', 'Process Flow Design', '功能流程图绘制', 'Create flow diagrams for user tasks', '创建用户任务流程图', 'Please create process flows including:

1. User Journey
   - Start point
   - End point
   - Decision points

2. System Interactions
   - User actions
   - System responses
   - Error handling

3. Documentation
   - Flow description
   - Technical notes
   - Edge cases', '2025-05-14 11:13:46.537628+00', '2025-05-16 15:09:40.792369+00', '3'), ('22a6333e-d310-45ae-9a41-7163e0afff60', '33333333-3333-3333-3333-333333333333', 'Feature Prioritization', '功能优先级排序', 'Prioritize features based on market demand and strategic value', '基于市场需求对功能进行优先级排序', 'Please prioritize the features based on:

1. Impact Assessment
   - User value
   - Business value
   - Strategic alignment

2. Implementation Complexity
   - Technical complexity
   - Resource requirements
   - Dependencies

3. Prioritization Matrix
   - Priority levels
   - Implementation order
   - Resource allocation', '2025-05-14 11:13:46.537628+00', '2025-05-16 15:09:40.792369+00', '3'), ('26bcbc9e-7e54-46ec-8133-5919d9c60021', '11111111-1111-1111-1111-111111111111', 'Product Value Proposition', '产品价值主张提炼', 'Craft a clear value proposition that resonates with users', '提炼清晰的产品价值主张', 'Please create a clear and compelling value proposition that addresses:

1. Core Problem
   - What specific problem does the product solve?
   - Why is this problem significant?

2. Solution Value
   - How does the product solve the problem?
   - What makes the solution unique?

3. User Benefits
   - What are the key benefits for users?
   - How do these benefits improve their lives?

Please ensure the value proposition is immediately understandable and compelling.', '2025-05-14 11:13:46.537628+00', '2025-05-16 15:09:40.792369+00', '2'), ('3ba30b8d-be77-4a90-a4a7-93d78143f338', '33333333-3333-3333-3333-333333333333', 'MVP Feature Definition', 'MVP功能定义', 'Define core features for your minimum viable product', '定义最小可行产品的核心功能', 'Please define the MVP features based on core user pain points:

1. Core Problem Analysis
   - Key user pain points
   - Priority assessment

2. Feature Definition
   - Must-have features
   - Nice-to-have features
   - Feature justification

3. MVP Scope
   - Feature prioritization
   - Implementation phases
   - Success metrics', '2025-05-14 11:13:46.537628+00', '2025-05-16 15:09:40.792369+00', '2'), ('41e699fc-ef71-4674-b641-8c0d05c8daec', '55555555-5555-5555-5555-555555555555', 'Growth Strategy', '增长黑客方案', 'Design a growth strategy with reward system', '设计包含奖励机制的增长策略', 'Please design a growth strategy including:

1. Acquisition Channels
   - Channel identification
   - Channel prioritization
   - Cost analysis

2. Reward System
   - Incentive structure
   - Reward mechanics
   - Anti-fraud measures

3. Implementation Plan
   - Rollout phases
   - Success metrics
   - Optimization process', '2025-05-14 11:13:46.537628+00', '2025-05-16 15:09:40.792369+00', '1'), ('4efeb0cb-41bf-4be6-b68b-1751784e8322', '22222222-2222-2222-2222-222222222222', 'User Pain Points Analysis', '用户痛点挖掘', 'Identify and analyze key user pain points', '识别和分析用户关键痛点', 'Please analyze the top 5 pain points for the target user group:

1. Pain Point Identification
   - Description of each pain point
   - Impact on users
   - Frequency of occurrence

2. Root Cause Analysis
   - Underlying factors
   - Current workarounds
   - Market gaps

3. Solution Opportunities
   - Potential solutions
   - Implementation challenges
   - Success metrics', '2025-05-14 11:13:46.537628+00', '2025-05-16 15:09:40.792369+00', '2'), ('5008c1a3-0f0d-4164-89f1-522003e8a95e', '55555555-5555-5555-5555-555555555555', 'A/B Testing Plan', 'A/B测试方案', 'Design an A/B test for feature or design changes', '设计功能或设计更改的A/B测试方案', 'Please create an A/B testing plan that includes:

1. Test Design
   - Hypothesis
   - Variables
   - Success metrics

2. Implementation Plan
   - Test duration
   - Sample size
   - Technical setup

3. Analysis Framework
   - Data collection
   - Statistical methods
   - Success criteria', '2025-05-14 11:13:46.537628+00', '2025-05-19 11:52:42.801402+00', '4'), ('5e924729-c723-423d-bec2-c77c045023c9', '77777777-7777-7777-7777-777777777777', 'Technical Feasibility Analysis', '技术可行性分析', 'Analyze technical implementation difficulty', '分析技术实现难度和可行性', 'Please analyze technical feasibility including:

1. Technical Assessment
   - Technology stack
   - Implementation complexity
   - Resource requirements

2. Risk Analysis
   - Technical risks
   - Mitigation strategies
   - Alternative approaches

3. Implementation Plan
   - Development phases
   - Resource allocation
   - Timeline estimates', '2025-05-14 11:13:46.537628+00', '2025-05-16 15:09:40.792369+00', '2'), ('6b2225d0-ff64-4e86-90ac-4294d0a9aaf5', '55555555-5555-5555-5555-555555555555', 'Product Operations Strategy', '产品运营策略', 'Develop a comprehensive operations strategy', '制定全面的产品运营策略', 'Please create an operations strategy covering:

1. User Lifecycle
   - Acquisition strategy
   - Activation process
   - Retention tactics
   - Monetization plan

2. Content Strategy
   - Content types
   - Creation process
   - Distribution channels

3. Community Building
   - Engagement tactics
   - Moderation plan
   - Growth metrics', '2025-05-14 11:13:46.537628+00', '2025-05-16 15:09:40.792369+00', '3'), ('82d0deef-9a45-4ec8-86e3-15171f97db6c', '33333333-3333-3333-3333-333333333333', 'Product Roadmap', '产品路线图规划', 'Create a one-year product roadmap with milestones', '制定包含里程碑的一年期产品路线图', 'Please create a detailed product roadmap including:

1. Timeline Planning
   - Quarterly goals
   - Key milestones
   - Release schedule

2. Feature Rollout
   - Feature grouping
   - Dependencies
   - Resource allocation

3. Success Metrics
   - KPIs per phase
   - Evaluation criteria
   - Adjustment triggers', '2025-05-14 11:13:46.537628+00', '2025-05-16 15:09:40.792369+00', '4'), ('89b5a970-3aa9-466a-9b92-566eb5b47e9c', '22222222-2222-2222-2222-222222222222', 'User Interview Questions', '用户访谈问题', 'Design interview questions to validate product assumptions', '设计访谈问题以验证产品假设', 'Please design a comprehensive user interview guide:

1. Warm-up Questions
   - Background information
   - Current solutions usage
   - General pain points

2. Product-specific Questions
   - Feature validation
   - Usage scenarios
   - Value proposition testing

3. Follow-up Questions
   - Deeper insights
   - Edge cases
   - Future needs

Include guidelines for conducting the interview effectively.', '2025-05-14 11:13:46.537628+00', '2025-05-16 15:09:40.792369+00', '3'), ('93d22192-c54b-41b7-b3a4-51c9de539694', '77777777-7777-7777-7777-777777777777', 'Technical Requirements', '技术需求文档', 'Convert user stories into technical requirements', '将用户故事转换为技术需求', 'Please create technical requirements including:

1. Functional Requirements
   - Feature specifications
   - Business rules
   - Data requirements

2. Non-functional Requirements
   - Performance criteria
   - Security requirements
   - Scalability needs

3. Technical Specifications
   - Architecture overview
   - Integration points
   - Development guidelines', '2025-05-14 11:13:46.537628+00', '2025-05-16 15:09:40.792369+00', '1'), ('b15d4162-0186-474e-9aeb-9c5a350e521e', '11111111-1111-1111-1111-111111111111', 'Pricing Strategy', '产品定价策略', 'Compare different pricing models for your product', '比较不同定价模式的适用性', 'Please analyze the following pricing models for the product:

1. Subscription Model
   - Pros and cons
   - Suitable pricing tiers
   - Revenue projections

2. One-time Purchase
   - Pricing considerations
   - Market positioning
   - Revenue stability

3. Freemium Model
   - Feature breakdown
   - Conversion strategy
   - Monetization potential

Please provide recommendations based on market analysis and target audience.', '2025-05-14 11:13:46.537628+00', '2025-05-16 15:09:40.792369+00', '3'), ('b1857287-e177-4520-a8a5-d576e525919a', '55555555-5555-5555-5555-555555555555', 'User Retention Strategy', '用户留存策略', 'Develop strategies to improve user retention', '制定提高用户留存率的策略', 'Please create a retention strategy addressing:

1. Retention Analysis
   - Current retention rates
   - Drop-off points
   - User segments

2. Retention Tactics
   - Engagement mechanisms
   - Value delivery
   - Communication strategy

3. Implementation Plan
   - Priority actions
   - Success metrics
   - Timeline', '2025-05-14 11:13:46.537628+00', '2025-05-16 15:09:40.792369+00', '2'), ('bf02eff6-0248-4c31-8436-67c24da59f08', '33333333-3333-3333-3333-333333333333', 'Product Requirements Document', '需求文档撰写', 'Generate a structured product requirements document', '生成结构化的产品需求文档', 'Please create a comprehensive PRD that includes:

1. Product Overview
   - Vision and goals
   - Target audience
   - Success metrics

2. Feature Requirements
   - Functional requirements
   - Technical requirements
   - User stories

3. Implementation Details
   - Priority levels
   - Dependencies
   - Timeline estimates

4. Success Criteria
   - Acceptance criteria
   - Testing requirements
   - Performance metrics', '2025-05-14 11:13:46.537628+00', '2025-05-16 15:09:40.792369+00', '1'), ('bff89a84-d948-4337-a0e1-96ec4bc12b04', '66666666-6666-6666-6666-666666666666', 'User Experience Design', '用户体验设计', 'Design user interface and interaction flows', '设计用户界面和交互流程', 'Please create a UX design plan including:

1. User Flow
   - Key user journeys
   - Interaction points
   - Error states

2. Interface Design
   - Layout principles
   - Navigation structure
   - Visual hierarchy

3. Interaction Design
   - Feedback mechanisms
   - Micro-interactions
   - Accessibility considerations', '2025-05-14 11:13:46.537628+00', '2025-05-16 15:09:40.792369+00', '1'), ('dbf70316-ea1b-42c8-b1e4-6ffd2476059e', '22222222-2222-2222-2222-222222222222', 'User Persona Building', '用户画像构建', 'Create detailed target user personas', '创建详细的目标用户画像', 'Please create detailed user personas that include:

1. Demographics
   - Age range
   - Occupation
   - Income level
   - Education

2. Behavioral Patterns
   - Daily routines
   - Technology usage
   - Purchase habits

3. Goals and Pain Points
   - Primary objectives
   - Current challenges
   - Unmet needs

4. Usage Scenarios
   - Key use cases
   - Context of use
   - Frequency of use', '2025-05-14 11:13:46.537628+00', '2025-05-16 15:09:40.792369+00', '1'), ('de957977-84df-4770-aafb-b3c9c8352ed9', '11111111-1111-1111-1111-111111111111', 'Product Vision Statement', '产品愿景定义', 'Create a concise vision statement for your product', '为产品创建简洁的愿景声明', 'Please provide a concise vision statement for the product that addresses:

1. Long-term Vision
   - Core value proposition
   - Target market impact
   - Future aspirations

2. Vision Analysis
   - Key elements explanation
   - Alignment with company strategy

3. Implementation Path
   - Key milestones
   - Potential challenges and solutions

Please ensure the output is concise and highlights the unique value and long-term direction of the product.', '2025-05-14 11:13:46.537628+00', '2025-05-16 15:09:40.792369+00', '1'), ('eaef0868-7b03-4343-ad62-dc89cb48b94a', '22222222-2222-2222-2222-222222222222', 'User Satisfaction Survey', '用户满意度调查', 'Design a comprehensive satisfaction survey', '设计全面的满意度调查问卷', 'Please create a user satisfaction survey that covers:

1. Product Usage
   - Frequency of use
   - Feature utilization
   - Use cases

2. Satisfaction Metrics
   - Overall satisfaction
   - Feature-specific satisfaction
   - NPS score

3. Improvement Areas
   - Pain points
   - Feature requests
   - Support experience

Include both quantitative and qualitative questions.', '2025-05-14 11:13:46.537628+00', '2025-05-16 15:09:40.792369+00', '4'), ('eb876494-3795-4ecd-81b4-0006d3fb8994', '77777777-7777-7777-7777-777777777777', 'Analytics Implementation', '埋点方案设计', 'Design an event tracking plan', '设计事件跟踪方案', 'Please create an analytics implementation plan including:

1. Event Definition
   - Key events
   - Event properties
   - User properties

2. Implementation Guide
   - Technical setup
   - Data collection
   - Quality assurance

3. Documentation
   - Event catalog
   - Integration guide
   - Maintenance plan', '2025-05-14 11:13:46.537628+00', '2025-05-16 15:09:40.792369+00', '3');