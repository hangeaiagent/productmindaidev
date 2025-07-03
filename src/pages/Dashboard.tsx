import React from 'react';
import TemplateList from '../components/TemplateList';
import ProjectSelector from '../components/ProjectSelector';
import ProductMindLogo from '../components/ProductMindLogo';
import { useAppContext } from '../context/AppContext';

const Dashboard: React.FC = () => {
  const { language } = useAppContext();
  
  const content = {
    zh: {
      title: '我的产品管理',
      subtitle: '管理您的产品项目，使用AI工具进行产品分析、需求管理和决策支持',
      welcome: '欢迎回来！'
    },
    en: {
      title: 'My Product Management',
      subtitle: 'Manage your product projects with AI-powered analysis, requirement management, and decision support',
      welcome: 'Welcome back!'
    }
  };
  
  const t = content[language];

  return (
    <div className="flex-1 min-h-screen bg-gradient-to-br from-[#4F8CFF] via-[#A259FF] to-[#6A82FB]">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#4F8CFF] to-[#A259FF] shadow-lg">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <ProductMindLogo size={48} className="drop-shadow-lg" />
            </div>
            <h1 className="text-4xl font-extrabold text-white mb-4 drop-shadow-lg">
              <span className="bg-gradient-to-r from-yellow-200 via-white to-purple-200 bg-clip-text text-transparent">
                {t.title}
              </span>
            </h1>
            <p className="text-lg text-white/80 max-w-2xl mx-auto leading-relaxed drop-shadow">
              {t.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto py-8 px-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/20">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4 drop-shadow">
              {t.welcome}
            </h2>
        <ProjectSelector />
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg">
        <TemplateList />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;