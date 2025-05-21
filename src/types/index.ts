// 现有类型定义...

export interface Template {
  id: string;
  category_id: string;
  name_en: string;
  name_zh: string;
  description_en: string;
  description_zh: string;
  prompt_content: string;
  created_at: string;
  updated_at: string;
  no: number;
  category?: TemplateCategory;
  versions?: TemplateVersion[];
}

export interface TemplateVersion {
  id: string;
  template_id: string;
  input_content: string;
  output_content: string;
  created_at: string;
  created_by: string | null;
  is_active: boolean;
  version_number: number;
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
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  is_default?: boolean;
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

// AI 模型类型
export type AIModel = 'deepseek' | 'openai' | 'claude' | 'google';

// 模型配置
export interface ModelConfig {
  id: string;
  name: string;
  version?: string;
  apiKey?: string;
  useSystemCredit?: boolean;
}

// AI消息类型
export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
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

// API错误响应
export interface APIError {
  message: string;
  type: string;
  details?: any;
}