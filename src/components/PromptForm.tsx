import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { AIModel } from '../types';

const PromptForm: React.FC = () => {
  const { 
    generateOutput, 
    isLoading, 
    language, 
    t, 
    currentProject, 
    setCurrentProject,
    selectedModel,
    setSelectedModel,
    modelConfigs,
    updateModelConfig
  } = useAppContext();
  
  const { user } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNewProject = () => {
    setCurrentProject({
      id: '',
      name: '',
      description: '',
      description: '',
      user_id: user?.id || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  };

  const handleSaveProject = async () => {
    if (!currentProject?.name) {
      setError(language === 'zh' ? '请填写项目名称和描述' : 'Please fill in project name and description');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const projectData = {
        name: currentProject.name,
        description: currentProject.description || '',
        updated_at: new Date().toISOString()
      };

      if (currentProject.id) {
        // 更新现有项目
        const { error } = await supabase
          .from('user_projects')
          .update(projectData)
          .eq('id', currentProject.id);

        if (error) throw error;
      } else {
        // 创建新项目
        const { data, error } = await supabase
          .from('user_projects')
          .insert({
            ...projectData,
            user_id: user?.id
          })
          .select()
          .single();

        if (error) throw error;
        setCurrentProject(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const models: { id: AIModel; name: string; versions: string[] }[] = [
    { 
      id: 'deepseek', 
      name: 'DeepSeek',
      versions: ['deepseek-chat', 'deepseek-coder']
    },
    { 
      id: 'openai', 
      name: 'OpenAI',
      versions: ['gpt-4', 'gpt-3.5-turbo']
    },
    { 
      id: 'claude', 
      name: 'Claude',
      versions: ['claude-3-opus', 'claude-3-sonnet']
    },
    { 
      id: 'google', 
      name: 'Google',
      versions: ['gemini-pro', 'gemini-pro-vision']
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject?.description) return;
    generateOutput(currentProject.description);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            {language === 'zh' ? '快速产品分析' : 'Quick Product Analysis'}
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={handleNewProject}
              className="px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100"
            >
              <Icons.Plus className="w-4 h-4 inline-block mr-1" />
              {language === 'zh' ? '新建' : 'New'}
            </button>
            <button
              onClick={handleSaveProject}
              disabled={saving || !currentProject?.name}
              className={`px-3 py-1.5 text-sm font-medium rounded ${
                saving || !currentProject?.name
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'text-white bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {saving ? (
                <>
                  <Icons.Loader className="w-4 h-4 inline-block mr-1 animate-spin" />
                  {language === 'zh' ? '保存中...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Icons.Save className="w-4 h-4 inline-block mr-1" />
                  {language === 'zh' ? '保存' : 'Save'}
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-2 text-sm text-red-600 bg-red-50 rounded">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {language === 'zh' ? '产品名称' : 'Product Name'}
            </label>
            <input
              type="text"
              value={currentProject?.name || ''}
              onChange={(e) => setCurrentProject(prev => ({
                ...prev!,
                name: e.target.value,
                name_zh: e.target.value,
                name_en: e.target.value
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder={language === 'zh' ? '请输入产品名称' : 'Enter product name'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {language === 'zh' ? '产品概述' : 'Product Overview'}
            </label>
            <div className="relative">
              <textarea
                value={currentProject?.description || ''}
                onChange={(e) => setCurrentProject(prev => ({
                  ...prev!,
                  description: e.target.value,
                  description_zh: e.target.value,
                  description_en: e.target.value
                }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder={language === 'zh' ? 
                  '请用一句话描述您的产品概念（例如：开发一个帮助用户管理日常任务的应用）' : 
                  'Describe your product concept in one sentence'
                }
                required
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                {t('ai.model')}
              </label>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                {showSettings ? t('hide.settings') : t('show.settings')}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={`flex items-center justify-center px-4 py-2 rounded-lg border ${
                    selectedModel === model.id
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <span className="text-sm font-medium">{model.name}</span>
                </button>
              ))}
            </div>

            {showSettings && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('model.version')}
                    </label>
                    <select
                      value={modelConfigs[selectedModel]?.version || models.find(m => m.id === selectedModel)?.versions[0]}
                      onChange={(e) => updateModelConfig(selectedModel, {
                        ...modelConfigs[selectedModel],
                        version: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {models.find(m => m.id === selectedModel)?.versions.map((version) => (
                        <option key={version} value={version}>
                          {version}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API Key
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="password"
                        value={modelConfigs[selectedModel]?.apiKey || ''}
                        onChange={(e) => updateModelConfig(selectedModel, {
                          ...modelConfigs[selectedModel],
                          apiKey: e.target.value
                        })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder={`${models.find(m => m.id === selectedModel)?.name} API Key`}
                        disabled={modelConfigs[selectedModel]?.useSystemCredit}
                      />
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={modelConfigs[selectedModel]?.useSystemCredit || false}
                          onChange={(e) => updateModelConfig(selectedModel, {
                            ...modelConfigs[selectedModel],
                            useSystemCredit: e.target.checked,
                            apiKey: e.target.checked ? '' : modelConfigs[selectedModel]?.apiKey || ''
                          })}
                          className="rounded border-gray-300 text-indigo-600"
                        />
                        <span className="text-sm text-gray-600">{t('system.credit')}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={isLoading || !currentProject?.description}
          className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            isLoading || !currentProject?.description
              ? 'bg-indigo-300 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
          }`}
        >
          {isLoading ? (
            <>
              <Icons.Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
              {language === 'zh' ? '分析中...' : 'Analyzing...'}
            </>
          ) : (
            <>
              <Icons.Sparkles className="-ml-1 mr-2 h-4 w-4" />
              {language === 'zh' ? '开始分析' : 'Start Analysis'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PromptForm;