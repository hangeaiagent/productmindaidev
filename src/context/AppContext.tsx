import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useTemplates } from '../hooks/useTemplates';
import { buildPrompt } from '../utils/promptBuilder';
import { generateStream } from '../services/aiService';
import { logger } from '../utils/logger';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { AIModel, Language, GeneratedOutput, ModelConfig, Template, Project } from '../types';
import debounce from 'lodash/debounce';

// 默认的模型配置
const DEFAULT_MODEL_CONFIG: ModelConfig = {
  id: 'deepseek',
  name: 'DeepSeek',
  version: 'deepseek-chat',
  apiKey: 'sk-567abb67b99d4a65acaa2d9ed06c3782',
  useSystemCredit: true
};

// 定义上下文类型接口
interface AppContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  setStreamingOutput: (output: string) => void;
  selectedModel: AIModel;
  setSelectedModel: (model: AIModel) => void;
  modelConfigs: Record<AIModel, ModelConfig>;
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// 应用上下文提供者组件
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 基础状态管理
  const [language, setLanguage] = useState<Language>('zh');
  const { user } = useAuth();
  const [selectedModel, setSelectedModel] = useState<AIModel>('deepseek');
  const [modelConfigs, setModelConfigs] = useState<Record<AIModel, ModelConfig>>({
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
    
    logger.log('开始生成输出', { 
      templateId: templateToUse?.id,
      modelType: selectedModel,
      inputLength: input.length,
      projectId
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

    const config = modelConfigs[selectedModel];
    if (!config) {
      // 如果没有配置，使用默认配置
      const defaultConfig = { ...DEFAULT_MODEL_CONFIG };
      updateModelConfig(selectedModel, defaultConfig);
    }

    setIsLoading(true);
    setError(null);
    setStreamingOutput('');

    try {
      const prompt = buildPrompt(
        templateToUse,
        currentProject?.name || '未命名项目',
        input,
        language
      );

      logger.log('开始生成流式输出', {
        templateName: language === 'zh' ? templateToUse.name_zh : templateToUse.name_en,
        promptLength: prompt.length
      });

      const stream = await generateStream(selectedModel, config, prompt);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let fullOutput = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        fullOutput += chunk;
        setStreamingOutput(fullOutput);
        logger.debug('收到流式输出块', { chunkLength: chunk.length });
      }

      logger.log('流式输出完成', { 
        outputLength: fullOutput.length,
        templateId: templateToUse.id,
        projectId
      });

      try {
        // 创建新的模板版本
        // 创建新的模板版本
        const { data: versionData, error: versionError } = await supabase
          .from('template_versions')
          .insert({
            template_id: templateToUse.id,
            project_id: projectId,
            input_content: prompt,
            output_content: fullOutput,
            created_by: user?.id,
            is_active: true
          })
          .select()
          .single();

        if (versionError) {
          logger.error('创建模板版本失败', {
            error: versionError.message,
            details: versionError,
            templateId: templateToUse.id,
          });
          throw versionError;
        }

        logger.log('分析结果已成功保存', {
          projectId,
          versionId: versionData?.id,
          templateId: templateToUse.id
        });

        // 重新加载项目历史记录
        await loadProjectHistory(projectId);

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '保存分析结果失败';
        logger.error('保存分析结果时发生错误', {
          error: errorMsg,
          projectId,
          templateId: templateToUse.id
        });
        setError(language === 'zh' ? 
          '分析结果生成成功，但保存失败。请稍后重试。' : 
          'Analysis completed but failed to save. Please try again later.'
        );
      }
      
      // 更新生成的输出列表
      const newOutput: GeneratedOutput = {
        id: Date.now().toString(),
        promptId: templateToUse.id,
        promptTitle: language === 'zh' ? templateToUse.name_zh : templateToUse.name_en,
        input,
        output: fullOutput,
        timestamp: Date.now(),
        model: selectedModel
      };

      setGeneratedOutputs(prev => [newOutput, ...prev]);
      logger.log('输出已保存到历史记录', { outputId: newOutput.id });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '生成过程中发生错误';
      logger.error('生成失败', error);
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
    setModelSettingsOpen
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