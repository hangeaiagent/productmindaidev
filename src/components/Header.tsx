import React, { useState } from 'react';
import { GlassesIcon as MagnifyingGlassIcon, BookmarkIcon as XMarkIcon, Search } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import LanguageSwitch from './LanguageSwitch';
import ModelSettings from './ModelSettings';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const { searchTemplates, setSelectedTemplate, t, language, handleAIFundingSearch } = useAppContext();
  const { isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ReturnType<typeof searchTemplates>>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim()) {
      const results = searchTemplates(query);
      setSearchResults(results);
      setIsSearchOpen(true);
    } else {
      setSearchResults([]);
      setIsSearchOpen(false);
    }
  };

  const handleSelectResult = (templateId: string) => {
    const template = searchResults.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setSearchQuery('');
      setIsSearchOpen(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchOpen(false);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  };

  return (
    <header className="bg-indigo-600 text-white sticky top-0 z-10 shadow-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
            <path d="M17 14h.01" />
          </svg>
          <h1 className="text-xl font-bold">ProductMind AI</h1>
        </div>

        <div className="relative w-full max-w-md mx-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-indigo-200" />
            <input
              type="text"
              placeholder={t('search.placeholder')}
              value={searchQuery}
              onChange={handleSearch}
              className="w-full bg-indigo-700 rounded-full py-2 pl-10 pr-10 text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-white"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <XMarkIcon className="h-5 w-5 text-indigo-200 hover:text-white" />
              </button>
            )}
          </div>

          {isSearchOpen && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-white rounded-md shadow-lg overflow-hidden z-20">
              <div className="max-h-96 overflow-y-auto">
                {searchResults.map((template) => (
                  <button
                    key={template.id}
                    className="w-full text-left px-4 py-3 hover:bg-indigo-50 border-b border-gray-100 text-gray-800"
                    onClick={() => handleSelectResult(template.id)}
                  >
                    <p className="font-medium">{template.title}</p>
                    <p className="text-sm text-gray-500">{template.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <ModelSettings />
          <LanguageSwitch />
          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-700 rounded-md hover:bg-indigo-800"
            >
              {language === 'zh' ? '退出' : 'Logout'}
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-white hover:text-indigo-200"
              >
                {language === 'zh' ? '登录' : 'Login'}
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-700 rounded-md hover:bg-indigo-800"
              >
                {language === 'zh' ? '注册' : 'Register'}
              </Link>
            </div>
          )}
          <a
            href="https://github.com/hangeaiagent/productmindaidev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-100 hover:text-white"
          >
            <span className="sr-only">GitHub</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
              <path d="M9 18c-4.51 2-5-2-7-2" />
            </svg>
          </a>
          <button
            onClick={handleAIFundingSearch}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            <Search className="w-4 h-4 mr-2" />
            {t('搜索AI融资项目')}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;