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

        <div className="flex items-center space-x-4">
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
          <Link
            to="/dashboard"
            className="px-4 py-2 text-sm font-medium text-white hover:text-indigo-200"
          >
            {language === 'zh' ? '我的产品' : 'My Products'}
          </Link>
          <Link
            to="/ai-products"
            className="px-4 py-2 text-sm font-medium text-white hover:text-indigo-200"
          >
            {language === 'zh' ? 'AI产品参考' : 'AI Products'}
          </Link>
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
        </div>
      </div>
    </header>
  );
};

export default Header;