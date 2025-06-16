import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ChevronRight, ChevronDown, Search, Filter, ArrowLeft, ExternalLink, Download, Globe, LogIn, UserPlus, Github, Star, Eye, Zap, Brain, Sparkles, TrendingUp, Users, Clock, Play, BookOpen, Code } from 'lucide-react';

interface Category {
  id: string;
  category_code: string;
  category_name: string;
  category_name_en?: string;
  display_name?: string;
  category_name_zh?: string;
  parent_category_code: string | null;
  category_level: number;
  sort_order: number;
  project_count?: number;
}

interface Project {
  id: string;
  name: string;
  description: string;
  name_zh?: string;
  description_zh?: string;
  name_en?: string;
  description_en?: string;
  name_display?: string;
  description_display?: string;
  primary_category: string;
  secondary_category: string;
  primary_category_code: string;
  secondary_category_code: string;
  created_at: string;
}

const AIProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const { categoryCode } = useParams();
  
  // 默认设置为英文
  const [language, setLanguage] = useState<'en' | 'zh'>('en');
  const [categories, setCategories] = useState<Category[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryCode || '');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // 多语言文本
  const texts = {
    en: {
      title: 'AI Products Hub',
      subtitle: 'Discover & Build Amazing AI Solutions',
      backToHome: 'Back to Home',
      searchPlaceholder: 'Search AI products and solutions...',
      productCategories: 'Product Categories',
      allProducts: 'All Products',
      totalProducts: 'Found {count} AI products',
      viewDetails: 'View Details',
      getTemplate: 'Get Template',
      quickDemo: 'Quick Demo',
      livePreview: 'Live Preview',
      getStarted: 'Get Started',
      tryNow: 'Try Now',
      noResults: 'No Results Found',
      noResultsDesc: 'Try using different keywords',
      noProductsInCategory: 'No products in this category',
      createdAt: 'Created on',
      myProducts: 'My Products',
      login: 'Login',
      register: 'Register',
      languageSwitch: 'Language',
      featuredProducts: 'Featured AI Products',
      trending: 'Trending',
      popular: 'Popular',
      latest: 'Latest'
    },
    zh: {
      title: 'AI产品中心',
      subtitle: '发现和构建卓越的AI解决方案',
      backToHome: '返回首页',
      searchPlaceholder: '搜索AI产品和解决方案...',
      productCategories: '产品分类',
      allProducts: '全部产品',
      totalProducts: '共找到 {count} 个相关AI产品',
      viewDetails: '查看详情',
      getTemplate: '获取模板',
      quickDemo: '快速演示',
      livePreview: '在线预览',
      getStarted: '开始使用',
      tryNow: '立即尝试',
      noResults: '未找到相关产品',
      noResultsDesc: '尝试使用其他关键词搜索',
      noProductsInCategory: '该分类下暂无产品',
      createdAt: '创建于',
      myProducts: '我的产品',
      login: '登录',
      register: '注册',
      languageSwitch: '语言',
      featuredProducts: '精选AI产品',
      trending: '热门',
      popular: '流行',
      latest: '最新'
    }
  };

  const t = texts[language];

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'zh' : 'en');
  };

  const handleLogin = () => {
    alert(language === 'en' ? 'Login functionality will be implemented' : '登录功能将会实现');
  };

  const handleRegister = () => {
    alert(language === 'en' ? 'Register functionality will be implemented' : '注册功能将会实现');
  };

  const handleGithub = () => {
    window.open('https://github.com/hangeaiagent/productmindaidev', '_blank');
  };

  // 获取分类数据
  const fetchCategories = async () => {
    try {
      const response = await fetch(`/.netlify/functions/get-categories?language=${language}`);
      const data = await response.json();
      if (data.success) {
        setCategories(data.categories);
        // 默认展开所有一级分类
        const primaryCategories = data.categories
          .filter((cat: Category) => cat.category_level === 1)
          .map((cat: Category) => cat.category_code);
        setExpandedCategories(new Set(primaryCategories));
      }
    } catch (error) {
      console.error('获取分类失败:', error);
    }
  };

  // 获取项目数据
  const fetchProjects = async (categoryCode?: string) => {
    try {
      console.log('📊 开始获取项目数据，分类:', categoryCode || '全部', '语言:', language);
      setLoading(true);
      let url = `/.netlify/functions/get-projects-by-category?language=${language}`;
      if (categoryCode) {
        url += `&category=${encodeURIComponent(categoryCode)}`;
      }
      
      console.log('🌐 请求URL:', url);
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        console.log('✅ 获取项目成功，数量:', data.projects.length);
        setProjects(data.projects);
      } else {
        console.error('❌ 获取项目失败:', data.error);
      }
    } catch (error) {
      console.error('❌ 获取项目失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [language]);

  useEffect(() => {
    fetchProjects(selectedCategory);
  }, [selectedCategory, language]);

  // 监听URL参数变化，同步分类状态
  useEffect(() => {
    if (categoryCode !== undefined) {
      setSelectedCategory(categoryCode);
    }
  }, [categoryCode]);

  // 构建分类树
  const buildCategoryTree = () => {
    const primaryCategories = categories.filter(cat => cat.category_level === 1);
    const secondaryCategories = categories.filter(cat => cat.category_level === 2);
    
    return primaryCategories.map(primary => ({
      ...primary,
      children: secondaryCategories.filter(secondary => 
        secondary.parent_category_code === primary.category_code
      )
    }));
  };

  // 切换分类展开状态
  const toggleCategory = (categoryCode: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryCode)) {
      newExpanded.delete(categoryCode);
    } else {
      newExpanded.add(categoryCode);
    }
    setExpandedCategories(newExpanded);
  };

  // 选择分类
  const selectCategory = (categoryCode: string) => {
    console.log('🎯 选择分类:', categoryCode);
    setSelectedCategory(categoryCode);
    
    // 更新URL，但保持在当前页面
    if (categoryCode === '') {
      // 选择全部分类时，导航到基础路径
      navigate('/ai-products', { replace: true });
    } else {
      // 选择具体分类时，导航到带参数的路径
      navigate(`/ai-products/${categoryCode}`, { replace: true });
    }
  };

  // 过滤项目
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categoryTree = buildCategoryTree();
  const selectedCategoryInfo = categories.find(cat => cat.category_code === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Header with Gradient */}
      <div className="relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700"></div>
        
        {/* Animated Background Elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-20 h-20 bg-white rounded-full animate-pulse"></div>
          <div className="absolute top-32 right-20 w-16 h-16 bg-blue-200 rounded-full animate-bounce"></div>
          <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-purple-200 rounded-full animate-pulse"></div>
          <div className="absolute bottom-32 right-1/3 w-8 h-8 bg-indigo-200 rounded-full animate-bounce"></div>
        </div>

        <div className="relative container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            {/* Enhanced Logo and Title */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                {/* AI Logo with Gradient */}
                <div className="relative p-3 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-2xl opacity-20"></div>
                  <Brain className="w-8 h-8 text-white relative z-10" />
                  <Sparkles className="w-4 h-4 text-yellow-300 absolute -top-1 -right-1 animate-pulse" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">ProductMind AI</h1>
                  <p className="text-blue-100 text-sm">{t.subtitle}</p>
                </div>
              </div>
              <div className="h-12 w-px bg-white/30"></div>
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-yellow-300" />
                <h2 className="text-xl font-semibold text-white">{t.title}</h2>
              </div>
            </div>
            
            {/* Enhanced Navigation */}
            <div className="flex items-center space-x-4">
              {/* Language Switch with Enhanced Design */}
              <button
                onClick={toggleLanguage}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg hover:bg-white/30 transition-all duration-300"
              >
                <Globe className="w-4 h-4 mr-2" />
                {language === 'en' ? '中文' : 'English'}
              </button>

              {/* My Products */}
              <Link
                to="/dashboard"
                className="flex items-center px-4 py-2 text-sm font-medium text-white hover:bg-white/20 rounded-lg transition-all duration-300"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                {t.myProducts}
              </Link>

              {/* Auth Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleLogin}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white hover:bg-white/20 rounded-lg transition-all duration-300"
                >
                  <LogIn className="w-4 h-4 mr-1" />
                  {t.login}
                </button>
                <button
                  onClick={handleRegister}
                  className="flex items-center px-4 py-2 text-sm font-medium text-purple-900 bg-white rounded-lg hover:bg-gray-100 transition-all duration-300 shadow-lg"
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  {t.register}
                </button>
              </div>

              {/* GitHub with Enhanced Style */}
              <button
                onClick={handleGithub}
                className="p-2 text-white hover:bg-white/20 rounded-lg transition-all duration-300"
              >
                <Github className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Enhanced Search Section */}
          <div className="flex items-center justify-between bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-white hover:text-blue-200 transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
              {t.backToHome}
            </button>
            
            {/* Enhanced Search Bar */}
            <div className="relative max-w-2xl flex-1 mx-8">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-white/90 backdrop-blur-sm border border-white/50 rounded-2xl focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none text-gray-800 placeholder-gray-500 shadow-lg transition-all duration-300"
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center space-x-6 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">{filteredProjects.length}+</div>
                <div className="text-sm text-blue-200">AI Products</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{categories.length}+</div>
                <div className="text-sm text-blue-200">Categories</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Enhanced Left Sidebar */}
          <div className="w-80 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-6 h-fit sticky top-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Filter className="w-5 h-5 mr-2 text-purple-600" />
                {t.productCategories}
              </h2>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            </div>
            
            {/* All Products Option */}
            <div
              onClick={() => selectCategory('')}
              className={`group flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all duration-300 mb-3 ${
                selectedCategory === '' 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105' 
                  : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 border border-gray-200'
              }`}
            >
              <div className="flex items-center">
                <Star className={`w-4 h-4 mr-2 ${selectedCategory === '' ? 'text-yellow-300' : 'text-gray-400'}`} />
                <span className="font-medium">{t.allProducts}</span>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                selectedCategory === '' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'
              }`}>
                425+
              </div>
            </div>

            {/* Category Tree */}
            <div className="space-y-2">
              {categoryTree.map((primaryCategory) => (
                <div key={primaryCategory.category_code} className="border border-gray-100 rounded-2xl overflow-hidden">
                  {/* Primary Category */}
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50">
                    <button
                      onClick={() => toggleCategory(primaryCategory.category_code)}
                      className="w-full flex items-center justify-between p-4 hover:bg-white/50 transition-all duration-300"
                    >
                      <div className="flex items-center">
                        {expandedCategories.has(primaryCategory.category_code) ? (
                          <ChevronDown className="w-4 h-4 text-purple-600 mr-2 transition-transform" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-purple-600 mr-2 transition-transform" />
                        )}
                        <span className="font-medium text-gray-900">
                          {primaryCategory.display_name || primaryCategory.category_name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-3 h-3 text-green-500" />
                        <span className="text-sm font-medium text-gray-600 bg-white px-2 py-1 rounded-full">
                          {primaryCategory.project_count || 0}
                        </span>
                      </div>
                    </button>
                  </div>

                  {/* Secondary Categories */}
                  {expandedCategories.has(primaryCategory.category_code) && (
                    <div className="p-2 space-y-1 bg-white">
                      {primaryCategory.children.map((secondaryCategory) => (
                        <div
                          key={secondaryCategory.category_code}
                          onClick={() => selectCategory(secondaryCategory.category_code)}
                          className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-300 ${
                            selectedCategory === secondaryCategory.category_code
                              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                              : 'hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50'
                          }`}
                        >
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-3 ${
                              selectedCategory === secondaryCategory.category_code ? 'bg-yellow-300' : 'bg-blue-400'
                            }`}></div>
                            <span className="text-sm font-medium">
                              {secondaryCategory.display_name || secondaryCategory.category_name}
                            </span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            selectedCategory === secondaryCategory.category_code 
                              ? 'bg-white/20 text-white' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {secondaryCategory.project_count || 0}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Enhanced Right Content */}
          <div className="flex-1">
            {/* Enhanced Category Header */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-8 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      {selectedCategoryInfo ? (selectedCategoryInfo.display_name || selectedCategoryInfo.category_name) : t.featuredProducts}
                    </h2>
                  </div>
                  <p className="text-gray-600 text-lg">
                    {t.totalProducts.replace('{count}', filteredProjects.length.toString())}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Users className="w-4 h-4" />
                    <span>{t.popular}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <TrendingUp className="w-4 h-4" />
                    <span>{t.trending}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Projects Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
                  <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 absolute top-0 left-0"></div>
                  <Brain className="w-6 h-6 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
              </div>
            ) : (
              <div className="grid gap-8">
                {filteredProjects.map((project, index) => (
                  <div
                    key={project.id}
                    className="group bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-500 overflow-hidden hover:-translate-y-2"
                    style={{
                      animationDelay: `${index * 100}ms`,
                      animation: 'fadeInUp 0.6s ease-out forwards'
                    }}
                  >
                    {/* Project Header with Gradient */}
                    <div className="p-8">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-4">
                            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl">
                              <Brain className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-1">
                                <button
                                  onClick={() => window.open(`/dashboard?projectId=${project.id}&isPublic=true`, '_blank')}
                                  className="text-left hover:underline"
                                >
                                  {project.name}
                                </button>
                              </h3>
                              <div className="flex items-center space-x-2 text-sm text-gray-500">
                                <Clock className="w-4 h-4" />
                                <span>
                                  {t.createdAt} {new Date(project.created_at).toLocaleDateString(language === 'en' ? 'en-US' : 'zh-CN')}
                                </span>
                              </div>
                            </div>
                          </div>

                          <p className="text-gray-600 mb-6 leading-relaxed text-lg">
                            {project.description || (language === 'en' ? 'Innovative AI solution designed to transform your workflow' : '创新的AI解决方案，旨在改变您的工作流程')}
                          </p>

                          {/* Enhanced Tags */}
                          <div className="flex items-center flex-wrap gap-3 mb-6">
                            <span className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full text-sm font-medium shadow-lg">
                              {project.primary_category}
                            </span>
                            {project.secondary_category && (
                              <span className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-full text-sm font-medium shadow-lg">
                                {project.secondary_category}
                              </span>
                            )}
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                              {t.latest}
                            </span>
                          </div>

                          {/* Enhanced Action Buttons */}
                          <div className="flex items-center space-x-4">
                            <button
                              onClick={() => window.open(`/dashboard?projectId=${project.id}&isPublic=true`, '_blank')}
                              className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                            >
                              <Play className="w-4 h-4 mr-2" />
                              <span className="font-medium">{t.tryNow}</span>
                            </button>

                            <button
                              onClick={() => window.open(`/dashboard?projectId=${project.id}&isPublic=true`, '_blank')}
                              className="flex items-center px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-2xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-300 shadow-lg hover:shadow-xl"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              <span className="font-medium">{t.livePreview}</span>
                            </button>

                            <button
                              onClick={() => window.open(`/dashboard?projectId=${project.id}&isPublic=true`, '_blank')}
                              className="flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              <span className="font-medium">{t.getTemplate}</span>
                            </button>
                          </div>
                        </div>

                        {/* Project Stats */}
                        <div className="ml-8 text-right">
                          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-4 mb-4">
                            <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                              <Star className="w-4 h-4 text-yellow-500" />
                              <span>4.8/5</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Users className="w-4 h-4 text-blue-500" />
                              <span>1.2k users</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/dashboard?projectId=${project.id}&isPublic=true`, '_blank');
                            }}
                            className="flex items-center px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            <span className="text-sm">{t.viewDetails}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredProjects.length === 0 && !loading && (
                  <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50">
                    <div className="text-gray-400 mb-6">
                      <div className="w-24 h-24 mx-auto bg-gradient-to-r from-gray-100 to-blue-100 rounded-full flex items-center justify-center mb-4">
                        <Search className="w-12 h-12 text-gray-400" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">{t.noResults}</h3>
                    <p className="text-gray-600 text-lg">
                      {searchTerm ? t.noResultsDesc : t.noProductsInCategory}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default AIProductsPage; 