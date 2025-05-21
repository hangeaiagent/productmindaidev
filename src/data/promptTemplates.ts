import { PromptTemplate } from '../types';

const promptTemplates: PromptTemplate[] = [
  // 用户研究类
  {
    id: 'user-persona',
    title: {
      en: 'User Persona Building',
      zh: '用户画像构建'
    },
    description: {
      en: 'Create detailed target user personas for your product.',
      zh: '为您的产品创建详细的目标用户画像。'
    },
    category: 'research',
    placeholder: {
      en: 'Enter your product name and general target audience',
      zh: '输入您的产品名称和目标受众群体'
    },
    icon: 'user'
  },
  {
    id: 'user-pain-points',
    title: {
      en: 'User Pain Point Analysis',
      zh: '用户痛点分析'
    },
    description: {
      en: 'Identify and analyze key pain points for your target users.',
      zh: '识别和分析目标用户的关键痛点。'
    },
    category: 'research',
    placeholder: {
      en: 'Enter your user group and product category',
      zh: '输入您的用户群体和产品类别'
    },
    icon: 'siren'
  },
  {
    id: 'competitor-analysis',
    title: {
      en: 'Competitor Analysis',
      zh: '竞品分析报告'
    },
    description: {
      en: 'Generate a comprehensive competitor analysis report.',
      zh: '生成全面的竞品分析报告。'
    },
    category: 'research',
    placeholder: {
      en: 'Enter your product and main competitors',
      zh: '输入您的产品及主要竞争对手'
    },
    icon: 'bar-chart'
  },
  {
    id: 'interview-questions',
    title: {
      en: 'User Interview Questions',
      zh: '用户访谈问题'
    },
    description: {
      en: 'Design interview questions to validate product assumptions.',
      zh: '设计访谈问题以验证产品假设。'
    },
    category: 'research',
    placeholder: {
      en: 'Enter your product concept and assumptions to validate',
      zh: '输入您的产品概念和需要验证的假设'
    },
    icon: 'help-circle'
  },
  {
    id: 'satisfaction-survey',
    title: {
      en: 'User Satisfaction Survey',
      zh: '用户满意度调查'
    },
    description: {
      en: 'Design a comprehensive user satisfaction survey.',
      zh: '设计全面的用户满意度调查问卷。'
    },
    category: 'research',
    placeholder: {
      en: 'Enter your product name and key features',
      zh: '输入您的产品名称和关键功能'
    },
    icon: 'clipboard-list'
  },

  // 产品规划类
  {
    id: 'mvp-definition',
    title: {
      en: 'MVP Feature Definition',
      zh: 'MVP功能定义'
    },
    description: {
      en: 'Define core features for your minimum viable product.',
      zh: '基于核心用户痛点，定义最小可行产品的核心功能。'
    },
    category: 'planning',
    placeholder: {
      en: 'Enter your product concept and target pain points',
      zh: '输入您的产品概念和目标痛点'
    },
    icon: 'package'
  },
  {
    id: 'product-features',
    title: {
      en: 'Product Feature Design',
      zh: '产品功能设计'
    },
    description: {
      en: 'Generate a comprehensive feature list with descriptions.',
      zh: '生成详细的产品功能列表及说明。'
    },
    category: 'planning',
    placeholder: {
      en: 'Enter your product name and category',
      zh: '输入您的产品名称和类别'
    },
    icon: 'list-todo'
  },
  {
    id: 'product-requirements',
    title: {
      en: 'Product Requirements Doc',
      zh: '产品需求文档'
    },
    description: {
      en: 'Generate a structured product requirements document.',
      zh: '生成结构化的产品需求文档。'
    },
    category: 'planning',
    placeholder: {
      en: 'Enter your product name and core functionality',
      zh: '输入您的产品名称和核心功能'
    },
    icon: 'file-text'
  },
  {
    id: 'feature-prioritization',
    title: {
      en: 'Feature Prioritization',
      zh: '功能优先级排序'
    },
    description: {
      en: 'Prioritize features based on market demand and strategic value.',
      zh: '基于市场需求对产品功能进行优先级排序。'
    },
    category: 'planning',
    placeholder: {
      en: 'Enter your product features list',
      zh: '输入您的产品功能列表'
    },
    icon: 'list-ordered'
  },
  {
    id: 'product-roadmap',
    title: {
      en: 'Product Roadmap Planning',
      zh: '产品路线图规划'
    },
    description: {
      en: 'Create a one-year product roadmap with milestones.',
      zh: '制定包含里程碑的一年期产品路线图。'
    },
    category: 'planning',
    placeholder: {
      en: 'Enter your prioritized feature list',
      zh: '输入您已排序的功能列表'
    },
    icon: 'map'
  },

  // 商业策略类
  {
    id: 'product-vision',
    title: {
      en: 'Product Vision Statement',
      zh: '产品愿景声明'
    },
    description: {
      en: 'Create a concise product vision statement.',
      zh: '创建简洁的产品愿景声明。'
    },
    category: 'strategy',
    placeholder: {
      en: 'Enter your product purpose and target market',
      zh: '输入您的产品目的和目标市场'
    },
    icon: 'eye'
  },
  {
    id: 'value-proposition',
    title: {
      en: 'Product Value Proposition',
      zh: '产品价值主张'
    },
    description: {
      en: 'Craft a clear value proposition for your product.',
      zh: '提炼产品的核心价值主张。'
    },
    category: 'strategy',
    placeholder: {
      en: 'Enter your product and core problem it solves',
      zh: '输入您的产品及其解决的核心问题'
    },
    icon: 'award'
  },
  {
    id: 'pricing-strategy',
    title: {
      en: 'Product Pricing Strategy',
      zh: '产品定价策略'
    },
    description: {
      en: 'Compare different pricing models for your product.',
      zh: '对比不同定价模式的适用性。'
    },
    category: 'strategy',
    placeholder: {
      en: 'Enter your product type and target market',
      zh: '输入您的产品类型和目标市场'
    },
    icon: 'tag'
  },
  {
    id: 'product-naming',
    title: {
      en: 'Product Naming Suggestions',
      zh: '产品命名建议'
    },
    description: {
      en: 'Generate potential names for your product.',
      zh: '为您的产品生成潜在名称建议。'
    },
    category: 'strategy',
    placeholder: {
      en: 'Enter your target users and core problem solved',
      zh: '输入您的目标用户和解决的核心问题'
    },
    icon: 'tag'
  },

  // 增长与分析类
  {
    id: 'growth-strategy',
    title: {
      en: 'Growth Hacking Strategy',
      zh: '增长黑客策略'
    },
    description: {
      en: 'Design a growth strategy with reward system.',
      zh: '设计包含奖励机制的增长策略。'
    },
    category: 'growth',
    placeholder: {
      en: 'Enter your product type and target audience',
      zh: '输入您的产品类型和目标受众'
    },
    icon: 'trending-up'
  },
  {
    id: 'product-operations',
    title: {
      en: 'Product Operations Strategy',
      zh: '产品运营策略'
    },
    description: {
      en: 'Develop a comprehensive operations strategy.',
      zh: '制定全面的产品运营策略。'
    },
    category: 'growth',
    placeholder: {
      en: 'Enter your product name and business model',
      zh: '输入您的产品名称和商业模式'
    },
    icon: 'cog'
  },
  {
    id: 'retention-strategy',
    title: {
      en: 'User Retention Strategy',
      zh: '用户留存策略'
    },
    description: {
      en: 'Develop strategies to improve user retention.',
      zh: '制定提高用户留存率的策略。'
    },
    category: 'growth',
    placeholder: {
      en: 'Enter your product type and current retention issues',
      zh: '输入您的产品类型和当前留存问题'
    },
    icon: 'users'
  },
  {
    id: 'market-trends',
    title: {
      en: 'Market Trend Forecast',
      zh: '市场趋势预测'
    },
    description: {
      en: 'Predict market trends for your product category.',
      zh: '预测您的产品类别的市场趋势。'
    },
    category: 'analysis',
    placeholder: {
      en: 'Enter your product category',
      zh: '输入您的产品类别'
    },
    icon: 'trending-up'
  },
  {
    id: 'key-metrics',
    title: {
      en: 'Product Key Metrics',
      zh: '产品关键指标'
    },
    description: {
      en: 'Identify core metrics to measure product health.',
      zh: '确定衡量产品健康度的核心指标。'
    },
    category: 'analysis',
    placeholder: {
      en: 'Enter your product type',
      zh: '输入您的产品类型'
    },
    icon: 'activity'
  },
  {
    id: 'ab-testing',
    title: {
      en: 'A/B Testing Plan',
      zh: 'A/B测试方案'
    },
    description: {
      en: 'Design an A/B test for feature or design changes.',
      zh: '设计功能或设计更改的A/B测试方案。'
    },
    category: 'analysis',
    placeholder: {
      en: 'Enter the feature or design element to test',
      zh: '输入要测试的功能或设计元素'
    },
    icon: 'split'
  },
  {
    id: 'analytics-plan',
    title: {
      en: 'Analytics Implementation Plan',
      zh: '埋点方案设计'
    },
    description: {
      en: 'Design an event tracking plan for your features.',
      zh: '为您的功能设计埋点方案。'
    },
    category: 'analysis',
    placeholder: {
      en: 'Enter the feature to track',
      zh: '输入要跟踪的功能'
    },
    icon: 'activity'
  },

  // 设计类
  {
    id: 'dashboard-design',
    title: {
      en: 'Analytics Dashboard Design',
      zh: '数据看板设计'
    },
    description: {
      en: 'Design a data dashboard with key metrics.',
      zh: '设计包含关键指标的数据看板。'
    },
    category: 'design',
    placeholder: {
      en: 'Enter your product type and key metrics',
      zh: '输入您的产品类型和关键指标'
    },
    icon: 'layout-dashboard'
  },
  {
    id: 'ux-design',
    title: {
      en: 'User Experience Design',
      zh: '用户体验设计'
    },
    description: {
      en: 'Design user interface and interaction flows.',
      zh: '设计用户界面和交互流程。'
    },
    category: 'design',
    placeholder: {
      en: 'Enter your product purpose and main user tasks',
      zh: '输入您的产品目的和主要用户任务'
    },
    icon: 'figma'
  },
  {
    id: 'process-flow',
    title: {
      en: 'Feature Flow Diagram',
      zh: '功能流程图'
    },
    description: {
      en: 'Create a flow diagram for specific user tasks.',
      zh: '为特定用户任务创建流程图。'
    },
    category: 'design',
    placeholder: {
      en: 'Enter the product and user task',
      zh: '输入产品和用户任务'
    },
    icon: 'git-branch'
  },

  // 开发类
  {
    id: 'technical-feasibility',
    title: {
      en: 'Technical Feasibility Analysis',
      zh: '技术可行性分析'
    },
    description: {
      en: 'Analyze technical implementation difficulty.',
      zh: '分析技术实现难度和可行性。'
    },
    category: 'development',
    placeholder: {
      en: 'Enter your product concept and key features',
      zh: '输入您的产品概念和关键功能'
    },
    icon: 'code'
  },
  {
    id: 'user-stories',
    title: {
      en: 'User Story Creation',
      zh: '用户故事创建'
    },
    description: {
      en: 'Generate user stories for your features.',
      zh: '为您的产品功能生成用户故事。'
    },
    category: 'development',
    placeholder: {
      en: 'Enter your product features',
      zh: '输入您的产品功能'
    },
    icon: 'message-square'
  },
  {
    id: 'technical-requirements',
    title: {
      en: 'Technical Requirements Doc',
      zh: '技术需求文档'
    },
    description: {
      en: 'Convert user stories into technical requirements.',
      zh: '将用户故事转换为技术需求。'
    },
    category: 'development',
    placeholder: {
      en: 'Enter your user stories',
      zh: '输入您的用户故事'
    },
    icon: 'file-code'
  },
  {
    id: 'terminology-guide',
    title: {
      en: 'Product Terminology Guide',
      zh: '产品术语指南'
    },
    description: {
      en: 'Create a glossary of terms for your product.',
      zh: '创建产品术语表及定义。'
    },
    category: 'development',
    placeholder: {
      en: 'Enter your product or project name',
      zh: '输入您的产品或项目名称'
    },
    icon: 'book'
  }
];

export default promptTemplates;