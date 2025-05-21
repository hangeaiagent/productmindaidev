import { Template } from '../types';
import { logger } from './logger';

const LANGUAGE_PROMPTS = {
  zh: '请用中文输出内容。',
  en: 'Please provide the output in English.'
};

export function buildPrompt(
  template: Template,
  projectName: string,
  projectDescription: string,
  language: 'en' | 'zh'
): string {
  console.log('构建提示词 - 模板:', {
    templateId: template.id,
    templateName: language === 'zh' ? template.name_zh : template.name_en,
    language
  });

  // Get the base prompt content from the template
  const basePrompt = template.prompt_content;
  console.log('基础提示词内容:', basePrompt);

  // Add project context
  const projectContext = language === 'zh' ? 
    `产品名称：${projectName}\n产品描述：${projectDescription}\n\n` :
    `Product Name: ${projectName}\nProduct Description: ${projectDescription}\n\n`;
  
  console.log('项目上下文:', projectContext);

  // Add language instruction and combine all parts
  const languagePrompt = LANGUAGE_PROMPTS[language];
  const fullPrompt = `${projectContext}${basePrompt}\n\n${languagePrompt}`;
  
  console.log('最终完整提示词:', fullPrompt);
  return fullPrompt;
}