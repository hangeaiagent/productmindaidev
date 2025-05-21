import React from 'react';
import { AIModel } from '../types';
import { useAppContext } from '../context/AppContext';

const ModelSelector: React.FC = () => {
  const { selectedModel, setSelectedModel, modelConfigs, updateModelConfig, t } = useAppContext();

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

  return (
    <div className="space-y-4">
      {models.map((model) => {
        const config = modelConfigs[model.id] || {};
        const isActive = selectedModel === model.id;
        
        return (
          <div 
            key={model.id}
            className={`p-4 rounded-lg border ${
              isActive ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <h3 className="font-medium text-gray-900">{model.name}</h3>
                <button
                  onClick={() => setSelectedModel(model.id)}
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {isActive ? '使用中' : '使用'}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <select
                  value={config.version || model.versions[0]}
                  onChange={(e) => updateModelConfig(model.id, { 
                    ...config,
                    version: e.target.value 
                  })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md"
                >
                  {model.versions.map((version) => (
                    <option key={version} value={version}>
                      {version}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="password"
                  placeholder={`${model.name} API Key`}
                  value={config.apiKey || ''}
                  onChange={(e) => updateModelConfig(model.id, {
                    ...config,
                    apiKey: e.target.value
                  })}
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md"
                />
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={!config.apiKey}
                    onChange={(e) => updateModelConfig(model.id, {
                      ...config,
                      apiKey: e.target.checked ? '' : config.apiKey || ''
                    })}
                    className="rounded border-gray-300 text-indigo-600"
                  />
                  <span className="text-sm text-gray-600">系统代付</span>
                </label>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ModelSelector;