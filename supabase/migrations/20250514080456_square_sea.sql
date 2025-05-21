/*
  # Populate template categories and templates

  1. New Data
    - Template categories for organizing product management templates
    - 30 predefined templates with bilingual names and descriptions
    
  2. Structure
    - Categories: strategy, research, planning, analysis, growth, design, development
    - Each template has name, description, and prompt content in both English and Chinese
    
  3. Security
    - Uses existing RLS policies from previous migration
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

-- Insert templates
INSERT INTO templates (category_id, name_en, name_zh, description_en, description_zh, prompt_content) VALUES
-- Strategy & Vision Category
(
  '11111111-1111-1111-1111-111111111111',
  'Product Vision Statement',
  '产品愿景定义',
  'Create a concise vision statement for your product',
  '为产品创建简洁的愿景声明',
  'Please provide a concise vision statement for the product that addresses:

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

Please ensure the output is concise and highlights the unique value and long-term direction of the product.'
),
(
  '11111111-1111-1111-1111-111111111111',
  'Product Value Proposition',
  '产品价值主张提炼',
  'Craft a clear value proposition that resonates with users',
  '提炼清晰的产品价值主张',
  'Please create a clear and compelling value proposition that addresses:

1. Core Problem
   - What specific problem does the product solve?
   - Why is this problem significant?

2. Solution Value
   - How does the product solve the problem?
   - What makes the solution unique?

3. User Benefits
   - What are the key benefits for users?
   - How do these benefits improve their lives?

Please ensure the value proposition is immediately understandable and compelling.'
),
(
  '11111111-1111-1111-1111-111111111111',
  'Pricing Strategy',
  '产品定价策略',
  'Compare different pricing models for your product',
  '比较不同定价模式的适用性',
  'Please analyze the following pricing models for the product:

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

Please provide recommendations based on market analysis and target audience.'
),

-- User Research Category
(
  '22222222-2222-2222-2222-222222222222',
  'User Persona Building',
  '用户画像构建',
  'Create detailed target user personas',
  '创建详细的目标用户画像',
  'Please create detailed user personas that include:

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
   - Frequency of use'
),
(
  '22222222-2222-2222-2222-222222222222',
  'User Pain Points Analysis',
  '用户痛点挖掘',
  'Identify and analyze key user pain points',
  '识别和分析用户关键痛点',
  'Please analyze the top 5 pain points for the target user group:

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
   - Success metrics'
),
(
  '22222222-2222-2222-2222-222222222222',
  'User Interview Questions',
  '用户访谈问题',
  'Design interview questions to validate product assumptions',
  '设计访谈问题以验证产品假设',
  'Please design a comprehensive user interview guide:

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

Include guidelines for conducting the interview effectively.'
),
(
  '22222222-2222-2222-2222-222222222222',
  'User Satisfaction Survey',
  '用户满意度调查',
  'Design a comprehensive satisfaction survey',
  '设计全面的满意度调查问卷',
  'Please create a user satisfaction survey that covers:

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

Include both quantitative and qualitative questions.'
),

-- Product Planning Category
(
  '33333333-3333-3333-3333-333333333333',
  'Product Requirements Document',
  '需求文档撰写',
  'Generate a structured product requirements document',
  '生成结构化的产品需求文档',
  'Please create a comprehensive PRD that includes:

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
   - Performance metrics'
),
(
  '33333333-3333-3333-3333-333333333333',
  'MVP Feature Definition',
  'MVP功能定义',
  'Define core features for your minimum viable product',
  '定义最小可行产品的核心功能',
  'Please define the MVP features based on core user pain points:

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
   - Success metrics'
),
(
  '33333333-3333-3333-3333-333333333333',
  'Feature Prioritization',
  '功能优先级排序',
  'Prioritize features based on market demand and strategic value',
  '基于市场需求对功能进行优先级排序',
  'Please prioritize the features based on:

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
   - Resource allocation'
),
(
  '33333333-3333-3333-3333-333333333333',
  'Product Roadmap',
  '产品路线图规划',
  'Create a one-year product roadmap with milestones',
  '制定包含里程碑的一年期产品路线图',
  'Please create a detailed product roadmap including:

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
   - Adjustment triggers'
),

-- Data & Analysis Category
(
  '44444444-4444-4444-4444-444444444444',
  'Market Trend Analysis',
  '市场趋势预测',
  'Analyze and predict market trends',
  '分析和预测市场趋势',
  'Please analyze market trends considering:

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
   - Market evolution'
),
(
  '44444444-4444-4444-4444-444444444444',
  'Competitor Analysis',
  '竞品分析报告',
  'Generate a comprehensive competitor analysis report',
  '生成全面的竞品分析报告',
  'Please analyze competitors focusing on:

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
   - Threats'
),
(
  '44444444-4444-4444-4444-444444444444',
  'Product Metrics Definition',
  '产品核心指标',
  'Define key metrics for product success',
  '定义产品成功的关键指标',
  'Please define key product metrics including:

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
   - Support metrics'
),
(
  '44444444-4444-4444-4444-444444444444',
  'A/B Testing Plan',
  'A/B测试方案',
  'Design an A/B test for feature or design changes',
  '设计功能或设计更改的A/B测试方案',
  'Please create an A/B testing plan that includes:

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
   - Success criteria'
),

-- Growth & Retention Category
(
  '55555555-5555-5555-5555-555555555555',
  'Growth Strategy',
  '增长黑客方案',
  'Design a growth strategy with reward system',
  '设计包含奖励机制的增长策略',
  'Please design a growth strategy including:

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
   - Optimization process'
),
(
  '55555555-5555-5555-5555-555555555555',
  'User Retention Strategy',
  '用户留存策略',
  'Develop strategies to improve user retention',
  '制定提高用户留存率的策略',
  'Please create a retention strategy addressing:

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
   - Timeline'
),
(
  '55555555-5555-5555-5555-555555555555',
  'Product Operations Strategy',
  '产品运营策略',
  'Develop a comprehensive operations strategy',
  '制定全面的产品运营策略',
  'Please create an operations strategy covering:

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
   - Growth metrics'
),

-- Design & Experience Category
(
  '66666666-6666-6666-6666-666666666666',
  'User Experience Design',
  '用户体验设计',
  'Design user interface and interaction flows',
  '设计用户界面和交互流程',
  'Please create a UX design plan including:

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
   - Accessibility considerations'
),
(
  '66666666-6666-6666-6666-666666666666',
  'Dashboard Design',
  '数据看板设计',
  'Design a data dashboard with key metrics',
  '设计包含关键指标的数据看板',
  'Please design a dashboard that includes:

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
   - Update frequency'
),
(
  '66666666-6666-6666-6666-666666666666',
  'Process Flow Design',
  '功能流程图绘制',
  'Create flow diagrams for user tasks',
  '创建用户任务流程图',
  'Please create process flows including:

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
   - Edge cases'
),

-- Development Category
(
  '77777777-7777-7777-7777-777777777777',
  'Technical Requirements',
  '技术需求文档',
  'Convert user stories into technical requirements',
  '将用户故事转换为技术需求',
  'Please create technical requirements including:

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
   - Development guidelines'
),
(
  '77777777-7777-7777-7777-777777777777',
  'Technical Feasibility Analysis',
  '技术可行性分析',
  'Analyze technical implementation difficulty',
  '分析技术实现难度和可行性',
  'Please analyze technical feasibility including:

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
   - Timeline estimates'
),
(
  '77777777-7777-7777-7777-777777777777',
  'Analytics Implementation',
  '埋点方案设计',
  'Design an event tracking plan',
  '设计事件跟踪方案',
  'Please create an analytics implementation plan including:

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
   - Maintenance plan'
),
(
  '77777777-7777-7777-7777-777777777777',
  'Product Terminology Guide',
  '产品术语表创建',
  'Create a glossary of terms for your product',
  '创建产品术语表及定义',
  'Please create a terminology guide including:

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
   - Version control');