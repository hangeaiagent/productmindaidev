import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { AIModel } from '../types';
import * as Icons from 'lucide-react';

const ModelSettings: React.FC = () => {
  const { selectedModel, setSelectedModel, modelConfigs, updateModelConfig, t } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [tempConfigs, setTempConfigs] = useState(modelConfigs);

  useEffect(() => {
    setTempConfigs(modelConfigs);
  }, [modelConfigs]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

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

  const handleSave = async () => {
    const modelId = selectedModel;
    const config = tempConfigs[modelId];

    if (!config?.apiKey && !config?.useSystemCredit) {
      setTestError('请设置 API Key 或使用系统代付');
      return;
    }

    // 更新配置
    Object.entries(tempConfigs).forEach(([model, config]) => {
      updateModelConfig(model as AIModel, config);
    });

    setIsOpen(false);
    setTestError(null);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
      >
        <Icons.Settings className="h-4 w-4" />
        <span>{t('model.settings')}</span>
      </button>

      {isOpen && (
        <div 
          ref={modalRef}
          className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">{t('model.settings')}</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Icons.X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {models.map((model) => {
                const isActive = selectedModel === model.id;
                const config = tempConfigs[model.id] || {};
                
                return (
                  <div 
                    key={model.id} 
                    className={`space-y-2 p-3 rounded-lg ${
                      isActive ? 'bg-indigo-50 border border-indigo-100' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <select
                          value={selectedModel === model.id ? config.version || model.versions[0] : model.id}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (model.versions.includes(value)) {
                              setTempConfigs(prev => ({
                                ...prev,
                                [model.id]: { ...prev[model.id], version: value }
                              }));
                            } else {
                              setSelectedModel(value as AIModel);
                            }
                          }}
                          className="w-48 px-2 py-1 text-sm border border-gray-300 rounded-md bg-white text-gray-900"
                        >
                          <option value={model.id} className="text-gray-900">{model.name}</option>
                          {isActive && model.versions.map((version) => (
                            <option key={version} value={version} className="text-gray-900">
                              ├─ {version}
                            </option>
                          ))}
                        </select>
                      </div>
                      {!isActive && (
                        <button
                          onClick={() => setSelectedModel(model.id)}
                          className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
                        >
                          {t('use')}
                        </button>
                      )}
                    </div>
                    
                    {isActive && (
                      <div className="space-y-2">
                        <input
                          type="password"
                          placeholder={`${model.name} API Key`}
                          value={config.apiKey || ''}
                          onChange={(e) => setTempConfigs(prev => ({
                            ...prev,
                            [model.id]: {
                              ...prev[model.id],
                              apiKey: e.target.value
                            }
                          }))}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-900 placeholder-gray-500"
                          disabled={config.useSystemCredit}
                        />

                        <div className="flex items-center">
                          <label className="flex items-center space-x-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={config.useSystemCredit || false}
                              onChange={(e) => setTempConfigs(prev => ({
                                ...prev,
                                [model.id]: {
                                  ...prev[model.id],
                                  useSystemCredit: e.target.checked,
                                  apiKey: e.target.checked ? '' : prev[model.id]?.apiKey || ''
                                }
                              }))}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>{t('system.credit')}</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {testError && (
              <div className="mt-4 p-2 bg-red-50 text-red-600 text-sm rounded">
                {testError}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSave}
                disabled={isTesting}
                className={`px-4 py-2 rounded-md text-white font-medium ${
                  isTesting
                    ? 'bg-indigo-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {isTesting ? (
                  <div className="flex items-center">
                    <Icons.Loader className="animate-spin h-4 w-4 mr-2" />
                    {t('testing')}
                  </div>
                ) : (
                  t('save')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSettings;