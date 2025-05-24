import { generateStream } from './aiService';
import { logger } from '../utils/logger';
import type { AIModel, ModelConfig } from '../types';

export interface TranslationService {
  detectLanguage(text: string): Promise<'zh' | 'en'>;
  translate(text: string, from: 'zh' | 'en', to: 'zh' | 'en'): Promise<string>;
}

export class AITranslationService implements TranslationService {
  private defaultModel: AIModel = 'deepseek';
  private defaultConfig: ModelConfig = {
    id: 'deepseek',
    name: 'DeepSeek',
    version: 'deepseek-chat',
    apiKey: 'sk-567abb67b99d4a65acaa2d9ed06c3782',
    useSystemCredit: true
  };

  private async callAI(prompt: string): Promise<string> {
    try {
      logger.debug('翻译服务调用AI', { promptLength: prompt.length });
      
      const response = await generateStream(this.defaultModel, this.defaultConfig, prompt);
      const reader = response.getReader();
      const decoder = new TextDecoder();
      let result = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value);
      }
      
      const cleanResult = result.trim();
      logger.debug('AI翻译响应', { resultLength: cleanResult.length });
      
      return cleanResult;
    } catch (error) {
      logger.error('AI翻译调用失败', { error });
      throw error;
    }
  }

  async detectLanguage(text: string): Promise<'zh' | 'en'> {
    if (!text || text.trim().length === 0) {
      return 'zh'; // 默认返回中文
    }

    try {
      // 简单的客户端检测：检查是否包含中文字符
      const chineseRegex = /[\u4e00-\u9fff]/;
      if (chineseRegex.test(text)) {
        logger.debug('语言检测结果：中文', { text: text.substring(0, 50) });
        return 'zh';
      }
      
      // 如果没有中文字符，但是文本很短，使用AI进行更准确的检测
      if (text.length < 20) {
        const prompt = `请分析以下文本的语言，只返回 "zh" 表示中文，或 "en" 表示英文，不要返回其他内容：

"${text}"

语言代码：`;

        const result = await this.callAI(prompt);
        const detectedLang = result.toLowerCase().includes('zh') ? 'zh' : 'en';
        
        logger.debug('AI语言检测结果', { 
          text: text.substring(0, 50), 
          result: detectedLang 
        });
        
        return detectedLang;
      }
      
      // 其他情况默认为英文
      logger.debug('语言检测结果：英文', { text: text.substring(0, 50) });
      return 'en';
    } catch (error) {
      logger.error('语言检测失败，使用默认语言', { error, text: text.substring(0, 50) });
      return 'zh'; // 出错时默认返回中文
    }
  }

  async translate(text: string, from: 'zh' | 'en', to: 'zh' | 'en'): Promise<string> {
    if (!text || text.trim().length === 0) {
      return '';
    }

    if (from === to) {
      return text; // 如果源语言和目标语言相同，直接返回原文
    }

    try {
      const fromLang = from === 'zh' ? '中文' : '英文';
      const toLang = to === 'zh' ? '中文' : '英文';
      
      const prompt = `请将以下${fromLang}文本翻译成${toLang}，保持原意和风格，只返回翻译结果，不要添加任何解释：

${text}

翻译结果：`;

      const translatedText = await this.callAI(prompt);
      
      logger.debug('翻译完成', {
        from,
        to,
        originalLength: text.length,
        translatedLength: translatedText.length
      });
      
      return translatedText;
    } catch (error) {
      logger.error('翻译失败', { 
        error, 
        from, 
        to, 
        text: text.substring(0, 100) 
      });
      
      // 翻译失败时返回原文
      return text;
    }
  }

  /**
   * 批量翻译多个文本
   */
  async translateBatch(
    texts: string[], 
    from: 'zh' | 'en', 
    to: 'zh' | 'en'
  ): Promise<string[]> {
    try {
      const results = await Promise.all(
        texts.map(text => this.translate(text, from, to))
      );
      
      logger.debug('批量翻译完成', {
        count: texts.length,
        from,
        to
      });
      
      return results;
    } catch (error) {
      logger.error('批量翻译失败', { error, count: texts.length, from, to });
      return texts; // 出错时返回原文数组
    }
  }

  /**
   * 检测并自动翻译
   */
  async detectAndTranslate(text: string, targetLang: 'zh' | 'en'): Promise<{
    originalText: string;
    translatedText: string;
    detectedLang: 'zh' | 'en';
    targetLang: 'zh' | 'en';
  }> {
    const detectedLang = await this.detectLanguage(text);
    const translatedText = await this.translate(text, detectedLang, targetLang);
    
    return {
      originalText: text,
      translatedText,
      detectedLang,
      targetLang
    };
  }
}

// 导出单例实例
export const translationService = new AITranslationService(); 