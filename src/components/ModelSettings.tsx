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
    <div style={{ display: 'none' }}></div>
  );
};

export default ModelSettings;