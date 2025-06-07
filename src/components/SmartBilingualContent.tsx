import React, { useState, useEffect } from 'react';
import { Globe, Languages } from 'lucide-react';

interface SmartBilingualContentProps {
  content_zh?: string | { content: string };
  content_en?: string | { content: string };
  currentLanguage: 'zh' | 'en';
  onLanguageChange?: (language: 'zh' | 'en') => void;
  className?: string;
  showLanguageToggle?: boolean;
}

const SmartBilingualContent: React.FC<SmartBilingualContentProps> = ({
  content_zh,
  content_en,
  currentLanguage,
  onLanguageChange,
  className = '',
  showLanguageToggle = true
}) => {
  const [displayLanguage, setDisplayLanguage] = useState<'zh' | 'en'>(currentLanguage);
  
  // 获取实际内容字符串
  const getContentString = (content: string | { content: string } | undefined): string => {
    if (!content) return '';
    return typeof content === 'string' ? content : content.content || '';
  };
  
  const zhContent = getContentString(content_zh);
  const enContent = getContentString(content_en);
  
  // 智能内容选择逻辑
  const getDisplayContent = (): string => {
    if (displayLanguage === 'zh') {
      return zhContent || enContent || '暂无内容';
    } else {
      return enContent || zhContent || 'No content available';
    }
  };
  
  // 检查是否有双语内容可用
  const hasBilingualContent = zhContent && enContent;
  const hasAnyContent = zhContent || enContent;
  
  const handleLanguageToggle = (newLanguage: 'zh' | 'en') => {
    setDisplayLanguage(newLanguage);
    onLanguageChange?.(newLanguage);
  };
  
  useEffect(() => {
    setDisplayLanguage(currentLanguage);
  }, [currentLanguage]);
  
  if (!hasAnyContent) {
    return (
      <div className={`text-gray-500 italic ${className}`}>
        {currentLanguage === 'zh' ? '暂无内容' : 'No content available'}
      </div>
    );
  }
  
  return (
    <div className={`smart-bilingual-content ${className}`}>
      {/* 语言切换器 */}
      {showLanguageToggle && hasBilingualContent && (
        <div className="flex items-center space-x-2 mb-4 p-2 bg-gray-50 rounded-lg">
          <Languages className="h-4 w-4 text-gray-600" />
          <span className="text-sm text-gray-600">
            {currentLanguage === 'zh' ? '语言：' : 'Language:'}
          </span>
          <div className="flex space-x-1">
            <button
              onClick={() => handleLanguageToggle('zh')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                displayLanguage === 'zh'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              中文
            </button>
            <button
              onClick={() => handleLanguageToggle('en')}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                displayLanguage === 'en'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              English
            </button>
          </div>
          
          {/* 可用语言状态指示器 */}
          <div className="flex items-center space-x-1 ml-auto">
            <div className={`w-2 h-2 rounded-full ${zhContent ? 'bg-green-500' : 'bg-gray-300'}`} title="中文版本" />
            <div className={`w-2 h-2 rounded-full ${enContent ? 'bg-green-500' : 'bg-gray-300'}`} title="English Version" />
          </div>
        </div>
      )}
      
      {/* 内容显示区域 */}
      <div className="content-display">
        <div className="prose max-w-none">
          {getDisplayContent().split('\n').map((line, index) => (
            <p key={index} className="mb-2 text-gray-800 leading-relaxed">
              {line}
            </p>
          ))}
        </div>
        
        {/* 单语言提示 */}
        {!hasBilingualContent && hasAnyContent && showLanguageToggle && (
          <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            {currentLanguage === 'zh' 
              ? `仅有${zhContent ? '中文' : '英文'}版本可用` 
              : `Only ${zhContent ? 'Chinese' : 'English'} version available`}
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartBilingualContent; 