import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Language } from '../types';

const LanguageSwitch: React.FC = () => {
  const { language, setLanguage } = useAppContext();

  const languages: { id: Language; name: string }[] = [
    { id: 'en', name: 'EN' },
    { id: 'zh', name: '中文' },
  ];

  return (
    <div className="flex space-x-2">
      {languages.map((lang) => (
        <button
          key={lang.id}
          onClick={() => setLanguage(lang.id)}
          className={`px-2 py-1 text-sm font-medium rounded transition-colors ${
            language === lang.id
              ? 'bg-white text-indigo-600'
              : 'text-indigo-100 hover:text-white'
          }`}
        >
          {lang.name}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitch