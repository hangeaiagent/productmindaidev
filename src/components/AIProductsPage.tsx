import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ChevronRight, ChevronDown, Search, Filter, ArrowLeft, ExternalLink, Download, Globe, LogIn, UserPlus, Github } from 'lucide-react';

interface Category {
  id: string;
  category_code: string;
  category_name: string;
  parent_category_code: string | null;
  category_level: number;
  sort_order: number;
  project_count?: number;
}

interface Project {
  id: string;
  name: string;
  description: string;
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
      title: 'AI Products Reference',
      backToHome: 'Back to Home',
      searchPlaceholder: 'Search products...',
      productCategories: 'Product Categories',
      allProducts: 'All Products',
      totalProducts: 'Found {count} AI products',
      viewDetails: 'View Details',
      getTemplate: 'Get Template',
      noResults: 'No Results Found',
      noResultsDesc: 'Try using different keywords',
      noProductsInCategory: 'No products in this category',
      createdAt: 'Created on',
      myProducts: 'My Products',
      login: 'Login',
      register: 'Register',
      languageSwitch: 'Language'
    },
    zh: {
      title: 'AI产品参考库',
      backToHome: '返回首页',
      searchPlaceholder: '搜索产品...',
      productCategories: '产品分类',
      allProducts: '全部产品',
      totalProducts: '共找到 {count} 个相关AI产品',
      viewDetails: '查看详情',
      getTemplate: '获取模板',
      noResults: '未找到相关产品',
      noResultsDesc: '尝试使用其他关键词搜索',
      noProductsInCategory: '该分类下暂无产品',
      createdAt: '创建于',
      myProducts: '我的产品',
      login: '登录',
      register: '注册',
      languageSwitch: '语言'
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
      const response = await fetch('/.netlify/functions/get-categories');
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
      setLoading(true);
      let url = '/.netlify/functions/get-projects-by-category';
      if (categoryCode) {
        url += `?category=${encodeURIComponent(categoryCode)}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setProjects(data.projects);
      }
    } catch (error) {
      console.error('获取项目失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProjects(selectedCategory);
  }, [selectedCategory]);

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
    setSelectedCategory(categoryCode);
    navigate(`/ai-products/${categoryCode}`);
  };

  // 过滤项目
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categoryTree = buildCategoryTree();
  const selectedCategoryInfo = categories.find(cat => cat.category_code === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo和标题 */}
            <div className="flex items-center space-x-4">
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
              <div className="h-6 w-px bg-indigo-400"></div>
              <h2 className="text-lg font-semibold">{t.title}</h2>
            </div>
            
            {/* 右侧导航 */}
            <div className="flex items-center space-x-4">
              {/* 语言切换 */}
              <button
                onClick={toggleLanguage}
                className="flex items-center px-3 py-2 text-sm font-medium text-white hover:text-indigo-200 transition-colors"
              >
                <Globe className="w-4 h-4 mr-2" />
                {language === 'en' ? '中文' : 'English'}
              </button>

              {/* 进入我的产品 */}
              <Link
                to="/dashboard"
                className="px-4 py-2 text-sm font-medium text-white hover:text-indigo-200 transition-colors"
              >
                {t.myProducts}
              </Link>

              {/* 登录注册 */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleLogin}
                  className="flex items-center px-3 py-2 text-sm font-medium text-white hover:text-indigo-200 transition-colors"
                >
                  <LogIn className="w-4 h-4 mr-1" />
                  {t.login}
                </button>
                <button
                  onClick={handleRegister}
                  className="flex items-center px-3 py-2 text-sm font-medium text-white bg-indigo-700 rounded-md hover:bg-indigo-800 transition-colors"
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  {t.register}
                </button>
              </div>

              {/* GitHub链接 */}
              <button
                onClick={handleGithub}
                className="text-indigo-100 hover:text-white transition-colors"
              >
                <Github className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              {t.backToHome}
            </button>
            
            {/* 搜索框 */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-full"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* 左侧分类导航 */}
          <div className="w-80 bg-white rounded-lg shadow-sm border p-6 h-fit sticky top-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">{t.productCategories}</h2>
              <Filter className="w-5 h-5 text-gray-400" />
            </div>
            
            {/* 全部分类选项 */}
            <div
              onClick={() => selectCategory('')}
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors mb-2 ${
                selectedCategory === '' 
                  ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                  : 'hover:bg-gray-50'
              }`}
            >
              <span className="font-medium">{t.allProducts}</span>
              <span className="text-sm text-gray-500">425+</span>
            </div>

            {/* 分类树 */}
            <div className="space-y-1">
              {categoryTree.map((primaryCategory) => (
                <div key={primaryCategory.category_code}>
                  {/* 一级分类 */}
                  <div className="flex items-center">
                    <button
                      onClick={() => toggleCategory(primaryCategory.category_code)}
                      className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center">
                        {expandedCategories.has(primaryCategory.category_code) ? (
                          <ChevronDown className="w-4 h-4 text-gray-400 mr-2" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400 mr-2" />
                        )}
                        <span className="font-medium text-gray-900">
                          {primaryCategory.category_name}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {primaryCategory.project_count || 0}
                      </span>
                    </button>
                  </div>

                  {/* 二级分类 */}
                  {expandedCategories.has(primaryCategory.category_code) && (
                    <div className="ml-6 space-y-1">
                      {primaryCategory.children.map((secondaryCategory) => (
                        <div
                          key={secondaryCategory.category_code}
                          onClick={() => selectCategory(secondaryCategory.category_code)}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                            selectedCategory === secondaryCategory.category_code
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <span className="text-sm">{secondaryCategory.category_name}</span>
                          <span className="text-xs text-gray-500">
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

          {/* 右侧项目列表 */}
          <div className="flex-1">
            {/* 分类信息头部 */}
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {selectedCategoryInfo ? selectedCategoryInfo.category_name : t.allProducts}
              </h2>
              <p className="text-gray-600">
                {t.totalProducts.replace('{count}', filteredProjects.length.toString())}
              </p>
            </div>

            {/* 项目列表 */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="grid gap-6">
                {filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                            <button
                              onClick={() => window.open(`/products/${project.id}`, '_blank')}
                              className="text-left"
                            >
                              {project.name}
                            </button>
                          </h3>
                          <ExternalLink className="w-4 h-4 text-gray-400" />
                        </div>

                        <p className="text-gray-600 mb-4 leading-relaxed">
                          {project.description || (language === 'en' ? 'No description available' : '暂无描述')}
                        </p>

                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                            {project.primary_category}
                          </span>
                          {project.secondary_category && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                              {project.secondary_category}
                            </span>
                          )}
                          <span>
                            {t.createdAt} {new Date(project.created_at).toLocaleDateString(language === 'en' ? 'en-US' : 'zh-CN')}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col space-y-2 ml-6">
                        <button
                          onClick={() => window.open(`/products/${project.id}`, '_blank')}
                          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <span>{t.viewDetails}</span>
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </button>
                        
                        <button
                          onClick={() => window.open(`/products/${project.id}`, '_blank')}
                          className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          <span>{t.getTemplate}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredProjects.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <Search className="w-12 h-12 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{t.noResults}</h3>
                    <p className="text-gray-600">
                      {searchTerm ? t.noResultsDesc : t.noProductsInCategory}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIProductsPage; 