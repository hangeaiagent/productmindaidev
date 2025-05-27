export type AIModel = 'deepseek' | 'openai';

export interface ModelConfig {
  id: string;
  name: string;
  version?: string;
  apiKey?: string;
  useSystemCredit?: boolean;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DeepseekStreamResponse {
  choices?: Array<{
    delta?: {
      content?: string;
    };
  }>;
}

export class APIError extends Error {
  constructor(
    message: string,
    public type: 'AUTH_ERROR' | 'RATE_LIMIT' | 'SERVICE_ERROR' | 'INVALID_RESPONSE' | 'TIMEOUT_ERROR' | 'UNKNOWN_ERROR'
  ) {
    super(message);
    this.name = 'APIError';
  }
} 