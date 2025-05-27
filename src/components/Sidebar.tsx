import React from 'react';
import { useAppContext } from '../context/AppContext';
import * as Icons from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const CategoryIcons: Record<string, keyof typeof Icons> = {
  'strategy': 'Compass',
  'research': 'Search',
  'planning': 'Calendar',
  'analysis': 'BarChart',
  'growth': 'TrendingUp',
  'design': 'Palette',
  'development': 'Code'
};

const Sidebar: React.FC = () => {
  const { categories, language, t, setSelectedCategory } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentCategory = searchParams.get('category');
  const sortedCategories = [...categories].sort((a, b) => a.no - b.no);

  const handleCategoryClick = (categoryId: string) => {
    if (categoryId === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ category: categoryId });
    }
    setSelectedCategory(categoryId);
  };

  return (
    <div className="w-64 bg-white shadow-md flex flex-col h-[calc(100vh-64px)] border-r border-gray-200">      
      <div className="overflow-y-auto flex-grow">
        <ul className="py-4">
          <li className="px-4 py-2">
            <button
              onClick={() => handleCategoryClick('all')}
              className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded-md cursor-pointer ${
                !currentCategory
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icons.LayoutGrid className="h-5 w-5" />
              <span>{language === 'zh' ? '全部' : 'All'}</span>
            </button>
          </li>
          {sortedCategories.map((category) => {
            const IconComponent = Icons[CategoryIcons[category.id] || 'FileText'];
            const isActive = currentCategory === category.id;
            
            return (
              <li key={category.id} className="px-4 py-2">
                <button
                  onClick={() => handleCategoryClick(category.id)}
                  className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded-md cursor-pointer ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {IconComponent && <IconComponent className="h-5 w-5" />}
                  <span>{language === 'zh' ? category.name_zh : category.name_en}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      
      <div className="p-4 pb-8 border-t border-gray-200 bg-gradient-to-b from-white to-gray-50">
        <p className="text-xs text-gray-500">
          ProductMind AI © 2025
        </p>
        <p className="mt-3 text-sm font-medium text-indigo-600 italic leading-relaxed">
          Where AI Understands the Heart of Product Building!
        </p>
      </div>
    </div>
  );
};

export default Sidebar;