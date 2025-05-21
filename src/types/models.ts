// AI模型相关类型定义
export type AIModel = 'deepseek' | 'openai' | 'claude' | 'google';

export interface ModelConfig {
  id: AIModel;
  name: string;
  apiKey?: string;
  version?: string;
  useSystemCredit?: boolean;
}

export interface AIResponse {
  success: boolean;
  data?: string;
  error?: string;
  logs?: string[];
}

export interface AnalysisStep {
  title: string;
  content: string[];
  status: 'pending' | 'processing' | 'completed' | 'error';
}

export interface AnalysisResult {
  steps: AnalysisStep[];
  summary?: string;
  recommendations?: string[];
}