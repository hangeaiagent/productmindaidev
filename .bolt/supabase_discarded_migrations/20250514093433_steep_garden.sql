/*
  # Insert template data

  1. New Data
    - Insert template categories
    - Insert templates with prompts
  
  2. Changes
    - Add sample data for all tables
    - Link templates to categories
*/

-- Insert template categories
INSERT INTO template_categories (id, name_en, name_zh, description_en, description_zh) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Strategy & Vision', '策略与愿景', 'Strategic planning and vision setting', '战略规划和愿景设定'),
  ('22222222-2222-2222-2222-222222222222', 'User Research', '用户研究', 'User research and analysis', '用户研究与分析'),
  ('33333333-3333-3333-3333-333333333333', 'Product Planning', '产品规划', 'Product planning and requirements', '产品规划与需求'),
  ('44444444-4444-4444-4444-444444444444', 'Data & Analysis', '数据分析', 'Data analysis and metrics', '数据分析与指标'),
  ('55555555-5555-5555-5555-555555555555', 'Growth & Retention', '增长与留存', 'Growth hacking and user retention', '增长黑客与用户留存'),
  ('66666666-6666-6666-6666-666666666666', 'Design & Experience', '设计与体验', 'UX/UI design and user experience', '用户体验与界面设计'),
  ('77777777-7777-7777-7777-777777777777', 'Development', '开发', 'Technical planning and documentation', '技术规划与文档');

-- Insert templates for Strategy & Vision category
INSERT INTO templates (category_id, name_en, name_zh, description_en, description_zh, prompt_content) VALUES
(
  '11111111-1111-1111-1111-111111111111',
  'Product Vision Statement',
  '产品愿景定义',
  'Create a concise vision statement for your product',
  '为产品创建简洁的愿景声明',
  'Please analyze the product and create a vision statement that includes:
1. Core value proposition
2. Target market and impact
3. Long-term aspirations
4. Key differentiators'
);

-- Insert templates for User Research category
INSERT INTO templates (category_id, name_en, name_zh, description_en, description_zh, prompt_content) VALUES
(
  '22222222-2222-2222-2222-222222222222',
  'User Persona Building',
  '用户画像构建',
  'Create detailed target user personas',
  '创建详细的目标用户画像',
  'Please create detailed user personas including:
1. Demographics
2. Behavioral patterns
3. Goals and motivations
4. Pain points and needs
5. Usage scenarios'
);