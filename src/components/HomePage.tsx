import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Sparkles, Database, Globe, BarChart3, Github, LogIn, UserPlus, Languages } from 'lucide-react';
import AIProductIdeaGenerator from './AIProductIdeaGenerator';
import ProductMindLogo from './ProductMindLogo';
import { useAppContext } from '../context/AppContext';
import { logger } from '../utils/logger';

interface Content {
  [key: string]: {
    [key: string]: string | string[];
  };
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language, setLanguage } = useAppContext();

  // 检查密码重置参数
  useEffect(() => {
    console.log('🔧 [HomePage] 检查密码重置参数', {
      href: window.location.href,
      search: window.location.search,
      hash: window.location.hash,
      pathname: window.location.pathname,
      searchParams: Object.fromEntries(searchParams.entries())
    });

    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const code = searchParams.get('code');
    const hasHashToken = window.location.hash.includes('access_token');
    const hasRecovery = window.location.hash.includes('recovery');

    const hasResetParams = accessToken || refreshToken || code || hasHashToken || hasRecovery;

    console.log('🔧 [HomePage] 参数检测结果', {
      accessToken: !!accessToken,
      refreshToken: !!refreshToken,
      code: !!code,
      hasHashToken,
      hasRecovery,
      hasResetParams
    });

    if (hasResetParams) {
      logger.log('检测到密码重置参数，重定向到重置页面', {
        search: window.location.search,
        hash: window.location.hash,
        href: window.location.href
      });
      
      // 提取code参数并通过state传递，避免URL处理问题
      const extractedCode = code || 
                           new URLSearchParams(window.location.hash.slice(1)).get('access_token');
      
      console.log('🔧 [HomePage] 提取code并通过state传递:', {
        code: extractedCode ? extractedCode.substring(0, 8) + '...' : null,
        hasCode: !!extractedCode
      });
      
      // 清理当前URL并通过state传递code
      navigate('/auth/reset-password', { 
        replace: true,
        state: { resetCode: extractedCode }
      });
    } else {
      console.log('🔧 [HomePage] 未检测到密码重置参数，显示正常首页');
    }
  }, [searchParams, navigate]);

  // 多语言内容
  const content: Content = {
    en: {
      title: 'ProductMind AI',
      subtitle: 'Professional AI Product Management Platform. Discover 425+ quality AI products, access 25 professional templates, and enhance your product management efficiency.',
      myProducts: 'My Products',
      myProductsDesc: 'Manage your product projects with AI-powered analysis, requirement management, and decision support. Access professional product management document templates.',
      myProductsAction: 'Enter Product Management',
      aiProducts: 'AI Product Reference',
      aiProductsDesc: 'Explore 425+ curated AI product cases, categorized by functionality, business models, and success stories. Get product inspiration and market insights.',
      aiProductsAction: 'Browse AI Product Library',
      featuresTitle: 'Features',
      feature1Title: '425+ AI Products',
      feature1Desc: 'Quality AI product cases across 11 major categories',
      feature2Title: '25 Professional Templates',
      feature2Desc: 'Essential documents including PRD, MRD, BRD for product management',
      feature3Title: 'AI-Powered Analysis',
      feature3Desc: 'Data-driven product insights and decision support',
      ideaGeneratorTitle: 'AI Product Idea Generator',
      ideaGeneratorDesc: 'Enter your creative requirements and get comprehensive product analysis with technical recommendations',
      stat1: 'AI Products',
      stat2: 'Templates',
      stat3: 'Categories',
      stat4: 'Free to Use',
      login: 'Login',
      register: 'Register',
      github: 'GitHub'
    },
    zh: {
      title: 'ProductMind AI',
      subtitle: '专业的AI产品管理平台，为产品经理提供完整的工具和资源库。探索425+优质AI产品，获取25个专业模板，提升产品管理效率。',
      myProducts: '我的产品',
      myProductsDesc: '管理您的产品项目，使用AI工具进行产品分析、需求管理和决策支持。获取专业的产品管理文档模板。',
      myProductsAction: '进入产品管理',
      aiProducts: 'AI产品参考',
      aiProductsDesc: '探索425+精选AI产品案例，按分类查看产品功能、商业模式和成功案例。获取产品灵感和市场洞察。',
      aiProductsAction: '浏览AI产品库',
      featuresTitle: '核心功能',
      feature1Title: '425+ AI产品',
      feature1Desc: '涵盖11个主要分类的优质AI产品案例',
      feature2Title: '25个专业模板',
      feature2Desc: 'PRD、MRD、BRD等产品管理必备文档',
      feature3Title: 'AI智能分析',
      feature3Desc: '基于数据的产品洞察和决策支持',
      ideaGeneratorTitle: 'AI产品创意生成器',
      ideaGeneratorDesc: '输入创意需求，获得全面的产品分析和技术建议',
      stat1: 'AI产品案例',
      stat2: '专业模板',
      stat3: '产品分类',
      stat4: '免费使用',
      login: '登录',
      register: '注册',
      github: 'GitHub'
    }
  };

  const t = content[language];

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'zh' : 'en');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleRegister = () => {
    navigate('/register');
  };

  const handleGithub = () => {
    console.log('🐙 GitHub按钮被点击');
    console.log('即将打开链接: https://github.com/hangeaiagent/productmindaidev');
    window.open('https://github.com/hangeaiagent/productmindaidev', '_blank');
  };

  const handleDashboardClick = () => {
    console.log('🎯 进入产品管理按钮被点击');
    console.log('即将导航到: /dashboard');
    navigate('/dashboard');
  };

  const handleAIProductsClick = () => {
    console.log('🤖 AI产品参考按钮被点击');
    console.log('即将导航到: /ai-products');
    navigate('/ai-products');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4F8CFF] via-[#A259FF] to-[#6A82FB]">
      {/* Navigation Bar */}
      <nav className="bg-gradient-to-r from-[#4F8CFF] to-[#A259FF] shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <ProductMindLogo size={36} className="drop-shadow-lg" />
              <h1 className="text-3xl font-bold text-white tracking-wide">
                ProductMind <span className="text-yellow-200">AI</span>
              </h1>
            </div>

            {/* Navigation Actions */}
            <div className="flex items-center space-x-4">
              {/* My Products Button */}
              <button
                onClick={handleDashboardClick}
                className="flex items-center space-x-2 px-4 py-2 text-white font-medium bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg shadow-md hover:from-blue-600 hover:to-purple-600 transition"
              >
                <Database className="w-4 h-4" />
                <span className="text-sm">{t.myProducts}</span>
              </button>

              {/* AI Products Reference Button */}
              <button
                onClick={handleAIProductsClick}
                className="flex items-center space-x-2 px-4 py-2 text-white font-medium bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg shadow-md hover:from-purple-600 hover:to-blue-600 transition"
              >
                <Globe className="w-4 h-4" />
                <span className="text-sm">{t.aiProducts}</span>
              </button>

              {/* Language Toggle */}
              <button
                onClick={toggleLanguage}
                className="flex items-center space-x-2 px-3 py-2 text-white bg-white/10 hover:bg-white/20 rounded-lg transition"
                title={language === 'en' ? 'Switch to Chinese' : '切换到英文'}
              >
                <Languages className="w-4 h-4" />
                <span className="text-sm">{language === 'en' ? '中文' : 'EN'}</span>
              </button>

              {/* GitHub Link */}
              <button
                onClick={handleGithub}
                className="flex items-center space-x-2 px-3 py-2 text-white bg-white/10 hover:bg-white/20 rounded-lg transition"
                title={t.github as string}
              >
                <Github className="w-4 h-4" />
                <span className="text-sm hidden md:block">{t.github}</span>
              </button>

              {/* Login Button */}
              <button
                onClick={handleLogin}
                className="flex items-center space-x-2 px-4 py-2 text-white bg-white/10 hover:bg-white/20 rounded-lg transition"
              >
                <LogIn className="w-4 h-4" />
                <span className="text-sm font-medium">{t.login}</span>
              </button>

              {/* Register Button */}
              <button
                onClick={handleRegister}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg hover:from-yellow-500 hover:to-orange-600 transition shadow-lg"
              >
                <UserPlus className="w-4 h-4" />
                <span className="text-sm font-medium">{t.register}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <ProductMindLogo size={64} className="drop-shadow-2xl animate-pulse" />
          </div>
          <h1 className="text-5xl font-extrabold text-white mb-6 drop-shadow-lg">
            <span className="bg-gradient-to-r from-yellow-200 via-white to-purple-200 bg-clip-text text-transparent">
              {t.title}
            </span>
          </h1>
          <p className="text-xl text-white/80 mb-8 max-w-3xl mx-auto leading-relaxed drop-shadow">
            {t.subtitle}
          </p>
          
          {/* AI Product Idea Generator - 首屏显示 */}
          <div className="mb-16">
            <AIProductIdeaGenerator key="ai-product-generator" />
          </div>
          
          {/* Main Navigation Buttons */}
          <div className="flex flex-col md:flex-row gap-6 justify-center items-center max-w-4xl mx-auto">
            
            {/* My Products Button */}
            <div 
              onClick={handleDashboardClick}
              className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border border-gray-100 hover:border-blue-200 w-full md:w-96"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6 mx-auto group-hover:bg-blue-200 transition-colors duration-300">
                  <Database className="w-8 h-8 text-blue-600" />
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{t.myProducts}</h3>
                <p className="text-gray-600 mb-4">{t.myProductsDesc}</p>
                <button className="text-blue-600 hover:text-blue-800 font-medium">{t.myProductsAction}</button>
              </div>
            </div>

            {/* AI Product Reference Button */}
            <div 
              onClick={handleAIProductsClick}
              className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border border-gray-100 hover:border-blue-200 w-full md:w-96"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-6 mx-auto group-hover:bg-purple-200 transition-colors duration-300">
                  <Globe className="w-8 h-8 text-purple-600" />
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{t.aiProducts}</h3>
                <p className="text-gray-600 mb-4">{t.aiProductsDesc}</p>
                <button className="text-purple-600 hover:text-purple-800 font-medium">{t.aiProductsAction}</button>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="text-center p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4 mx-auto">
              <Globe className="w-6 h-6 text-green-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">{t.feature1Title}</h4>
            <p className="text-gray-600">{t.feature1Desc}</p>
          </div>
          
          <div className="text-center p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4 mx-auto">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">{t.feature2Title}</h4>
            <p className="text-gray-600">{t.feature2Desc}</p>
          </div>
          
          <div className="text-center p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-4 mx-auto">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">{t.feature3Title}</h4>
            <p className="text-gray-600">{t.feature3Desc}</p>
          </div>
        </div>



        {/* Statistics */}
        <div className="bg-white rounded-3xl p-8 mt-16 shadow-lg border border-gray-100">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">425+</div>
              <div className="text-gray-600">{t.stat1}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600 mb-2">25</div>
              <div className="text-gray-600">{t.stat2}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600 mb-2">11</div>
              <div className="text-gray-600">{t.stat3}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-600 mb-2">100%</div>
              <div className="text-gray-600">{t.stat4}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage; 