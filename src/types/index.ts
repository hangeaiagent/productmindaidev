// 现有类型定义...

export interface Template {
  id: string;
  category_id: string;
  name_en: string;
  name_zh: string;
  description_en: string;
  description_zh: string;
  prompt_content: string;
  mdcprompt?: string;  // 新增：用于生成cursor规则文件的提示词模板
  created_at: string;
  updated_at: string;
  no: number;
  category?: TemplateCategory;
  versions?: TemplateVersion[];
}

export interface TemplateVersion {
  id: string;
  template_id: string;
  project_id?: string;
  input_content: string;
  output_content: {
    content: string;
    annotations: any[];
  };
  output_content_zh: {
    content: string;
    annotations: any[];
  };
  output_content_en: {
    content: string;
    annotations: any[];
  };
  mdcpromptcontent_zh?: string;  // 新增：cursor规则文件的中文内容
  mdcpromptcontent_en?: string;  // 新增：cursor规则文件的英文内容
  source_language: 'zh' | 'en';
  created_at: string;
  updated_at: string;
  created_by: string;
  is_active: boolean;
  version_number: number;
  template?: {
    id: string;
    name_zh: string;
    name_en: string;
    category?: {
      id: string;
      name_zh: string;
      name_en: string;
    };
  };
}

export interface TemplateCategory {
  id: string;
  parent_id: string | null;
  name_en: string;
  name_zh: string;
  description_en: string;
  description_zh: string;
  created_at: string;
  updated_at: string;
  no: number;
  isshow?: number;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  name_zh: string;
  name_en: string;
  description_zh: string | null;
  description_en: string | null;
  source_language: 'zh' | 'en';
  created_at: string;
  updated_at: string;
  is_default?: boolean;
  is_open_source?: boolean;
  model_locked?: boolean;
  // AI Funding 相关字段
  company_info?: string;
  funding_info?: string;
  company_website?: string;
  funding_amount?: string;
  funding_round?: string;
  funding_date?: string | null;
  investors?: string[];
  company_location?: string;
  industry_tags?: string[];
  employee_count?: string;
  founding_date?: string | null;
  source_url?: string;
  source_name?: string;
  source_title?: string;
  source_date?: string | null;
  processed_at?: string | null;
  metadata?: any;
}

export interface ProjectAnalysis {
  id: string;
  project_id: string;
  template_id: string;
  input_content: string;
  output_content: string;
  version_number: number;
  is_active: boolean;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  generateOutput: (input: string, template?: Template) => Promise<void>;
  searchTemplates: (query: string) => Template[];
  t: (key: string) => string;
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
}

// 语言类型
export type Language = 'zh' | 'en';

// 生成输出类型
export interface GeneratedOutput {
  id: string;
  promptId: string;
  promptTitle: string;
  input: string;
  output: string;
  timestamp: number;
  model: AIModel;
  is_active: boolean;
}

// AI 模型类型
export type AIModel = 'deepseek' | 'openai' | 'claude' | 'google';

// 模型配置
export interface ModelConfig {
  id: AIModel;
  name: string;
  apiKey?: string;
  version?: string;
  useSystemCredit?: boolean;
}

// AI 消息
export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// API 错误
export class APIError extends Error {
  constructor(
    message: string,
    public type: 'AUTH_ERROR' | 'RATE_LIMIT' | 'SERVICE_ERROR' | 'INVALID_RESPONSE' | 'STREAM_ERROR' | 'TIMEOUT_ERROR' | 'UNKNOWN_ERROR'
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Deepseek流式响应格式
export interface DeepseekStreamResponse {
  id: string;
  choices: Array<{
    index: number;
    delta: {
      content?: string;
      role?: string;
    };
    finish_reason: string | null;
  }>;
  created: number;
  model: string;
  object: string;
  system_fingerprint?: string;
  usage?: {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
  } | null;
}

// 翻译服务接口
export interface TranslationResult {
  originalText: string;
  translatedText: string;
  detectedLang: 'zh' | 'en';
  targetLang: 'zh' | 'en';
}

export interface AIFundingProject {
  id: number;
  project_name: string;
  description: string;        // 产品说明
  company_info: string;       // 公司信息
  funding_info: string;       // 融资情况说明
  source_url: string;
  company_website: string;
  funding_amount: string;
  funding_round: string;
  funding_date: string;
  investors: string[];
  company_location: string;
  industry_tags: string[];
  employee_count: string;
  founding_date: string;
  created_at: string;
  updated_at: string;
}