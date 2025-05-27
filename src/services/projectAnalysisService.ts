import { supabase } from '../lib/supabase';
import { generateStream } from './aiService';
import { logger } from '../utils/logger';
import type { AIModel, ModelConfig } from '../types/index';

interface ProjectInfo {
  name: string;
  description: string;
  source_text: string;
  created_at: string;
}

const ANALYSIS_PROMPT = `
请分析以下文本，提取项目相关的关键信息：
{text}

请按照以下格式返回JSON：
{
  "project_name": "项目名称",
  "project_description": "项目功能说明"
}

只返回JSON格式数据，不要有其他文字。
`;

export class ProjectAnalysisService {
  private model: AIModel = 'deepseek';
  private modelConfig: ModelConfig = {
    id: 'deepseek',
    name: 'DeepSeek',
    version: 'deepseek-chat',
    apiKey: 'sk-567abb67b99d4a65acaa2d9ed06c3782',
    useSystemCredit: true
  };

  async analyzeText(text: string): Promise<ProjectInfo | null> {
    try {
      const prompt = ANALYSIS_PROMPT.replace('{text}', text);
      
      logger.debug('开始项目文本分析', { textLength: text.length });
      
      const response = await generateStream(this.model, this.modelConfig, prompt);
      const reader = response.getReader();
      const decoder = new TextDecoder();
      let result = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value);
      }

      try {
        const analysisResult = JSON.parse(result.trim());
        
        const projectInfo: ProjectInfo = {
          name: analysisResult.project_name,
          description: analysisResult.project_description,
          source_text: text,
          created_at: new Date().toISOString()
        };

        await this.saveToDatabase(projectInfo);
        
        logger.debug('项目分析完成', { 
          projectName: projectInfo.name,
          descriptionLength: projectInfo.description.length 
        });

        return projectInfo;
      } catch (parseError) {
        logger.error('解析AI响应失败', { error: parseError, result });
        return null;
      }
    } catch (error) {
      logger.error('项目分析失败', { error });
      return null;
    }
  }

  private async saveToDatabase(projectInfo: ProjectInfo): Promise<void> {
    try {
      const { error } = await supabase
        .from('projects')
        .insert([{
          name: projectInfo.name,
          description: projectInfo.description,
          source_text: projectInfo.source_text,
          created_at: projectInfo.created_at
        }]);

      if (error) {
        throw error;
      }

      logger.debug('项目信息已保存到数据库', { 
        projectName: projectInfo.name 
      });
    } catch (error) {
      logger.error('保存到数据库失败', { error });
      throw error;
    }
  }
} 