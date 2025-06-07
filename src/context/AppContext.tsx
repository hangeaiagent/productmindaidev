import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useTemplates } from '../hooks/useTemplates';
import { buildPrompt } from '../utils/promptBuilder';
import { generateStream } from '../services/aiService';
import { logger } from '../utils/logger';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { AIModel, Language, GeneratedOutput, ModelConfig } from '../types/index';
import type { Template, Project } from '../types';
import debounce from 'lodash/debounce';
import { translationService } from '../services/translationService';
import { toast } from 'react-hot-toast';

// 默认的模型配置
const DEFAULT_MODEL_CONFIG: ModelConfig = {
  id: 'deepseek',
  name: 'DeepSeek',
  version: 'deepseek-chat',
  apiKey: 'sk-567abb67b99d4a65acaa2d9ed06c3782',
  useSystemCredit: true
};

// 定义上下文类型接口
export interface AppContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  setStreamingOutput: (output: string) => void;
  selectedModel: AIModel;
  setSelectedModel: (model: AIModel) => void;
  modelConfigs: Partial<Record<AIModel, ModelConfig>>;
  updateModelConfig: (model: AIModel, config: ModelConfig) => void;
  templates: Template[];
  categories: any[];
  templatesLoading: boolean;
  currentProject: Project | null;
  setCurrentProject: React.Dispatch<React.SetStateAction<Project | null>>;
  selectedTemplate: Template | null;
  setSelectedTemplate: (template: Template | null) => void;
  generatedOutputs: GeneratedOutput[];
  setGeneratedOutputs: React.Dispatch<React.SetStateAction<GeneratedOutput[]>>;
  isLoading: boolean;
  loadProjectHistory: (projectId: string) => Promise<void>;
  streamingOutput: string;
  error: string | null;
  clearError: () => void;
  generateOutput: (input: string, template?: Template) => Promise<void>;
  refetchHistory: () => Promise<void>;
  searchTemplates: (query: string) => Template[];
  t: (key: string) => string;
  modelSettingsOpen: boolean;
  setModelSettingsOpen: (open: boolean) => void;
  handleAIFundingSearch: () => Promise<void>;
}

export const AppContext = createContext<AppContextType>({} as AppContextType);

// 应用上下文提供者组件
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 基础状态管理
  const [language, setLanguage] = useState<Language>(() => {
    // 尝试从 localStorage 获取语言偏好
    const savedLanguage = localStorage.getItem('userLanguagePreference');
    return (savedLanguage as Language) || 'en'; // 默认英文
  });
  const { user } = useAuth();
  const [selectedModel, setSelectedModel] = useState<AIModel>('deepseek');
  const [modelConfigs, setModelConfigs] = useState<Partial<Record<AIModel, ModelConfig>>>({
    deepseek: DEFAULT_MODEL_CONFIG
  });
  
  // 模板和输出相关状态
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [generatedOutputs, setGeneratedOutputs] = useState<GeneratedOutput[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [streamingOutput, setStreamingOutput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [modelSettingsOpen, setModelSettingsOpen] = useState(false);
  
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  
  // 使用防抖的日志记录函数
  const debouncedLogProjectUpdate = useCallback(
    debounce((project: Project | null) => {
      if (project?.id) {
        logger.debug('Current project state updated', {
          projectId: project.id,
          projectName: project.name,
          trigger: 'app_context_update',
          timestamp: new Date().toISOString()
        });
      }
    }, 1000), // 1秒的防抖时间
    []
  );

  // 监听 currentProject 变化
  useEffect(() => {
    debouncedLogProjectUpdate(currentProject);
    return () => {
      debouncedLogProjectUpdate.cancel(); // 清理防抖
    };
  }, [currentProject, debouncedLogProjectUpdate]);

  const { templates, categories, loading: templatesLoading } = useTemplates(currentProject?.id);

  // 当语言改变时保存到 localStorage
  useEffect(() => {
    localStorage.setItem('userLanguagePreference', language);
    
    // 如果用户已登录，同时更新到数据库
    if (user?.id) {
      supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          language: language,
          updated_at: new Date().toISOString()
        })
        .then(({ error }) => {
          if (error) {
            logger.error('保存用户语言偏好失败', { error });
          }
        });
    }
  }, [language, user?.id]);

  // 当用户登录时，从数据库加载语言偏好
  useEffect(() => {
    if (user?.id) {
      supabase
        .from('user_preferences')
        .select('language')
        .eq('user_id', user.id)
        .single()
        .then(({ data, error }) => {
          if (!error && data?.language) {
            setLanguage(data.language as Language);
          }
        });
    }
  }, [user?.id]);

  /**
   * 加载项目历史记录
   * @param projectId 项目ID
   */
  const loadProjectHistory = async (projectId: string) => {
    try {
      logger.log('加载项目历史', { projectId });
      logger.log('开始获取项目相关的模板数据', { projectId });

      // 查询项目的模板版本数据
      const { data, error } = await supabase
        .from('template_versions')
        .select(`
          *,
          template:templates (
            id,
            name_en,
            name_zh,
            description_en,
            description_zh
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

       if (error) throw error;

      // 转换数据格式为前端使用的格式
      const outputs = data.map(item => ({
        id: item.id,
        promptId: item.template.id,
        promptTitle: language === 'zh' ? item.template.name_zh : item.template.name_en,
        input: item.input_content,
        output: item.output_content,
        timestamp: new Date(item.created_at).getTime(),
        model: selectedModel,
        is_active: item.is_active,
      }));

      setGeneratedOutputs(outputs);
      logger.log('项目历史加载完成', { outputCount: outputs.length });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '加载项目历史失败';
      logger.error('加载项目历史失败', err);
      setError(errorMsg);
    }
  };

  /**
   * 搜索模板
   * @param query 搜索关键词
   * @returns 匹配的模板数组
   */
  const searchTemplates = (query: string): Template[] => {
    logger.log('执行模板搜索', { query });
    const searchTerm = query.toLowerCase();
    return templates.filter(template => {
      const nameMatch = language === 'zh' 
        ? template.name_zh.toLowerCase().includes(searchTerm)
        : template.name_en.toLowerCase().includes(searchTerm);
      const descMatch = language === 'zh'
        ? template.description_zh?.toLowerCase().includes(searchTerm)
        : template.description_en?.toLowerCase().includes(searchTerm);
      return nameMatch || descMatch;
    });
  };

  /**
   * 更新模型配置
   * @param model 模型类型
   * @param config 模型配置
   */
  const updateModelConfig = (model: AIModel, config: ModelConfig) => {
    logger.log('更新模型配置', { model, config: { ...config, apiKey: '[已隐藏]' } });
    setModelConfigs(prev => ({
      ...prev,
      [model]: config
    }));
  };

  /**
   * 清除错误信息
   */
  const clearError = () => setError(null);

  /**
   * 生成输出内容
   * @param input 输入内容
   * @param template 选择的模板
   */
  const generateOutput = async (input: string, template?: Template) => {
    const templateToUse = template || selectedTemplate;
    const projectId = currentProject?.id;
    
    logger.log('🚀 开始生成输出（基于网站语言设置的双语版本）', { 
      templateId: templateToUse?.id,
      modelType: selectedModel,
      inputLength: input.length,
      projectId,
      websiteLanguage: language,
      inputPreview: input.substring(0, 100)
    });

    if (!templateToUse) {
      const errorMsg = '请先选择模板';
      logger.error(errorMsg);
      setError(errorMsg);
      return;
    }

    if (!projectId) {
      const errorMsg = '请先创建或选择项目';
      logger.error(errorMsg);
      setError(errorMsg);
      return;
    }

    const config = modelConfigs[selectedModel] || DEFAULT_MODEL_CONFIG;

    setIsLoading(true);
    setError(null);
    setStreamingOutput('');

    try {
      // 🔄 修改：使用当前网站设置的语言作为主要语言，而不是检测输入内容的语言
      const primaryLang = language; // 使用当前网站设置的语言
      const secondaryLang = primaryLang === 'zh' ? 'en' : 'zh';

      logger.log('📋 语言设置策略（基于网站设置）', {
        websiteLanguage: language,
        primaryLang,
        secondaryLang,
        strategy: '使用网站设置语言作为主要语言'
      });

      // 🎯 生成主要语言版本的内容（基于网站设置的语言）
      const primaryPrompt = buildPrompt(
        templateToUse,
        currentProject?.name || '未命名项目',
        input,
        primaryLang
      );

      logger.log('🔥 开始生成主要语言版本（网站设置语言）', {
        templateName: primaryLang === 'zh' ? templateToUse.name_zh : templateToUse.name_en,
        promptLength: primaryPrompt.length,
        primaryLang,
        websiteLanguage: language
      });

      const primaryStream = await generateStream(selectedModel, config, primaryPrompt);
      const primaryReader = primaryStream.getReader();
      const primaryDecoder = new TextDecoder();
      let primaryOutput = '';

      while (true) {
        const { done, value } = await primaryReader.read();
        if (done) break;
        
        const chunk = primaryDecoder.decode(value);
        primaryOutput += chunk;
        setStreamingOutput(primaryOutput);
        logger.debug('📥 收到主要语言流式输出块', { 
          chunkLength: chunk.length,
          primaryLang,
          totalLength: primaryOutput.length
        });
      }

      logger.log('✅ 主要语言版本生成完成', { 
        outputLength: primaryOutput.length,
        primaryLang,
        websiteLanguage: language
      });

      // 🌐 翻译输入内容并生成另一种语言版本
      logger.log('🔄 开始翻译输入内容到另一种语言', { 
        fromLang: primaryLang, 
        toLang: secondaryLang,
        inputLength: input.length
      });
      
      const translatedInput = await translationService.translate(input, primaryLang, secondaryLang);
      
      const secondaryPrompt = buildPrompt(
        templateToUse,
        currentProject?.name || '未命名项目',
        translatedInput,
        secondaryLang
      );

      logger.log('🔥 开始生成另一种语言版本', {
        translatedInputLength: translatedInput.length,
        promptLength: secondaryPrompt.length,
        secondaryLang,
        translationPreview: translatedInput.substring(0, 100)
      });

      const secondaryStream = await generateStream(selectedModel, config, secondaryPrompt);
      const secondaryReader = secondaryStream.getReader();
      const secondaryDecoder = new TextDecoder();
      let secondaryOutput = '';

      while (true) {
        const { done, value } = await secondaryReader.read();
        if (done) break;
        
        const chunk = secondaryDecoder.decode(value);
        secondaryOutput += chunk;
        logger.debug('📥 收到次要语言流式输出块', { 
          chunkLength: chunk.length,
          secondaryLang,
          totalLength: secondaryOutput.length
        });
      }

      logger.log('✅ 另一种语言版本生成完成', { 
        outputLength: secondaryOutput.length,
        secondaryLang
      });

      // 📦 准备保存的数据结构
      const primaryOutputObj = {
        content: primaryOutput,
        annotations: []
      };

      const secondaryOutputObj = {
        content: secondaryOutput,
        annotations: []
      };

      // 🏷️ 根据网站设置的语言确定哪个是中文，哪个是英文
      const outputContentZh = primaryLang === 'zh' ? primaryOutputObj : secondaryOutputObj;
      const outputContentEn = primaryLang === 'en' ? primaryOutputObj : secondaryOutputObj;

      logger.log('💾 准备保存双语版本数据', {
        websiteLanguage: language,
        primaryLang,
        secondaryLang,
        zhContentLength: outputContentZh.content.length,
        enContentLength: outputContentEn.content.length,
        strategy: '基于网站设置语言的双语生成'
      });

      try {
        // 💾 创建新的模板版本，包含双语内容
        const { data: versionData, error: versionError } = await supabase
          .from('template_versions')
          .insert({
            template_id: templateToUse.id,
            project_id: projectId,
            input_content: input,
            output_content: primaryOutputObj,        // 保持兼容性，存储主要语言版本（网站设置语言）
            output_content_zh: outputContentZh,      // 中文版本
            output_content_en: outputContentEn,      // 英文版本
            source_language: primaryLang,            // 修改：使用网站设置语言作为源语言
            created_by: user?.id,
            is_active: true
          })
          .select()
          .single();

        if (versionError) {
          logger.error('❌ 创建模板版本失败', {
            error: versionError.message,
            details: versionError,
            templateId: templateToUse.id,
            websiteLanguage: language,
            primaryLang
          });
          throw versionError;
        }

        logger.log('🎉 双语分析结果已成功保存', {
          projectId,
          versionId: versionData?.id,
          templateId: templateToUse.id,
          websiteLanguage: language,
          primaryLang,
          secondaryLang,
          strategy: '基于网站设置语言'
        });

        // 🔄 重新加载项目历史记录
        await loadProjectHistory(projectId);

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '保存分析结果失败';
        logger.error('❌ 保存双语分析结果时发生错误', {
          error: errorMsg,
          projectId,
          templateId: templateToUse.id,
          websiteLanguage: language,
          primaryLang,
          secondaryLang
        });
        setError(language === 'zh' ? 
          '分析结果生成成功，但保存失败。请稍后重试。' : 
          'Analysis completed but failed to save. Please try again later.'
        );
      }
      
      // 📋 更新生成的输出列表（显示当前网站语言版本）
      const displayOutput = primaryOutput; // 直接显示主要语言版本（网站设置语言）
      const newOutput: GeneratedOutput = {
        id: Date.now().toString(),
        promptId: templateToUse.id,
        promptTitle: language === 'zh' ? templateToUse.name_zh : templateToUse.name_en,
        input,
        output: displayOutput,
        timestamp: Date.now(),
        model: selectedModel,
        is_active: true
      };

      setGeneratedOutputs(prev => [newOutput, ...prev]);
      logger.log('📝 双语输出已保存到历史记录', { 
        outputId: newOutput.id,
        websiteLanguage: language,
        primaryLang,
        secondaryLang,
        displayStrategy: '显示网站设置语言版本'
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '生成过程中发生错误';
      logger.error('❌ 双语生成失败', {
        error: errorMsg,
        websiteLanguage: language,
        inputPreview: input.substring(0, 100)
      });
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 重新获取项目历史记录
   */
  const refetchHistory = async () => {
    if (currentProject?.id) {
      await loadProjectHistory(currentProject.id);
    }
  };

  /**
   * 获取翻译文本
   * @param key 翻译键值
   */
  const t = (key: string): string => {
    return key;
  };

  const handleAIFundingSearch = async () => {
    try {
      const response = await fetch('/.netlify/functions/search-ai-funding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('搜索失败');
      }

      const data = await response.json();
      logger.log('AI融资项目搜索完成', { results: data });
      
      // 显示成功消息
      toast.success(`搜索完成：成功更新${data.count}条AI融资项目数据`);
    } catch (error) {
      logger.error('AI融资项目搜索失败', { error });
      toast.error(`搜索失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const value = {
    language,
    setLanguage,
    selectedModel,
    setSelectedModel,
    setStreamingOutput,
    modelConfigs,
    updateModelConfig,
    templates,
    categories,
    templatesLoading,
    currentProject,
    setCurrentProject,
    selectedTemplate,
    setSelectedTemplate,
    generatedOutputs,
    setGeneratedOutputs,
    isLoading,
    streamingOutput,
    error,
    clearError,
    loadProjectHistory,
    selectedCategory,
    setSelectedCategory,
    generateOutput,
    refetchHistory,
    searchTemplates,
    t,
    modelSettingsOpen,
    setModelSettingsOpen,
    handleAIFundingSearch,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
