import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

interface CrawlResult {
  success: boolean;
  summary?: {
    totalFound: number;
    totalCrawled: number;
    newProducts: number;
    duplicateProducts: number;
    successfullySaved: number;
    errors: number;
  };
  savedProjects?: any[];
  duplicateProducts?: Array<{
    name: string;
    originalName: string;
    description: string;
  }>;
  errors?: Array<{ project: string; error: string }>;
  error?: string;
  message?: string;
}

interface SavedProject {
  id: string;
  name: string;
  description: string;
  official_website: string;
  primary_category?: string;
  secondary_category?: string;
  category_path?: string;
}

export const AIBaseCrawler: React.FC = () => {
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlResult, setCrawlResult] = useState<CrawlResult | null>(null);

  const handleCrawlAIBaseProducts = async () => {
    setIsCrawling(true);
    setCrawlResult(null);
    
    try {
      toast.loading('开始采集AIbase产品...', { id: 'aibase-crawl' });
      
      const response = await fetch('/.netlify/functions/aibase-crawler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result: CrawlResult = await response.json();
      setCrawlResult(result);

      if (result.success) {
        toast.success(
          `AIbase采集完成！成功保存 ${result.summary?.successfullySaved} 个产品`,
          { id: 'aibase-crawl', duration: 5000 }
        );
      } else {
        toast.error(
          result.message || result.error || 'AIbase采集失败',
          { id: 'aibase-crawl', duration: 5000 }
        );
      }
    } catch (error) {
      console.error('AIbase采集错误:', error);
      toast.error('AIbase采集过程中发生错误', { id: 'aibase-crawl' });
      setCrawlResult({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      });
    } finally {
      setIsCrawling(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            AIbase产品采集器
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            从 AIbase.com 采集AI产品信息并保存到数据库
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            AI产品库
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">采集目标</h4>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              网站: https://top.aibase.com/
            </div>
            <div className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              数据: 产品名称、详细说明、官方网站
            </div>
            <div className="flex items-center">
              <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
              保存: user_projects 表
            </div>
          </div>
        </div>

        <button
          onClick={handleCrawlAIBaseProducts}
          disabled={isCrawling}
          className={`w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors duration-200 ${
            isCrawling
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          }`}
        >
          {isCrawling ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              正在采集AIbase产品...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              开始采集AIbase产品
            </>
          )}
        </button>

        {crawlResult && (
          <div className="mt-6 space-y-4">
            <div className={`p-4 rounded-lg ${
              crawlResult.success 
                ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                : 'bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800'
            }`}>
              <div className="flex items-center">
                {crawlResult.success ? (
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <h4 className={`font-medium ${
                  crawlResult.success 
                    ? 'text-green-800 dark:text-green-200' 
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  {crawlResult.success ? 'AIbase采集成功' : 'AIbase采集失败'}
                </h4>
              </div>
              
              {crawlResult.summary && (
                <div className="mt-3 grid grid-cols-2 md:grid-cols-6 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {crawlResult.summary.totalFound}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">发现产品</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {crawlResult.summary.totalCrawled}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">已采集</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {crawlResult.summary.newProducts}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">新产品</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {crawlResult.summary.duplicateProducts}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">重复产品</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {crawlResult.summary.successfullySaved}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">成功保存</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {crawlResult.summary.errors}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">错误数量</div>
                  </div>
                </div>
              )}

              {crawlResult.error && (
                <div className="mt-3 text-sm text-red-700 dark:text-red-300">
                  错误信息: {crawlResult.error}
                </div>
              )}

              {crawlResult.message && (
                <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                  {crawlResult.message}
                </div>
              )}
            </div>

            {crawlResult.savedProjects && crawlResult.savedProjects.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  成功保存的产品 ({crawlResult.savedProjects.length}个)
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {crawlResult.savedProjects.map((project, index) => (
                    <div key={index} className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium text-green-900 dark:text-green-100 text-sm">
                            {project.product?.name || project.name}
                          </h5>
                          {project.product?.description && (
                            <p className="text-green-700 dark:text-green-300 text-xs mt-1 line-clamp-2">
                              {project.product.description}
                            </p>
                          )}
                          {(project.product?.primary_category || project.product?.secondary_category) && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {project.product?.primary_category && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                  {project.product.primary_category}
                                </span>
                              )}
                              {project.product?.secondary_category && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                  {project.product.secondary_category}
                                </span>
                              )}
                            </div>
                          )}
                          {project.product?.category_path && (
                            <p className="text-green-600 dark:text-green-400 text-xs mt-1">
                              分类路径: {project.product.category_path}
                            </p>
                          )}
                          {project.product?.official_website && (
                            <a 
                              href={project.product.official_website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 text-xs mt-1 inline-block"
                            >
                              🔗 官方网站
                            </a>
                          )}
                        </div>
                        <span className="text-green-600 dark:text-green-400 text-xs ml-2">
                          ✅ 已保存
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {crawlResult.duplicateProducts && crawlResult.duplicateProducts.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  重复产品 ({crawlResult.duplicateProducts.length}个)
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {crawlResult.duplicateProducts.slice(0, 5).map((product, index) => (
                    <div key={index} className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium text-yellow-900 dark:text-yellow-100 text-sm">
                            {product.name}
                          </h5>
                          {product.originalName && product.originalName !== product.name && (
                            <p className="text-yellow-700 dark:text-yellow-300 text-xs">
                              原名: {product.originalName}
                            </p>
                          )}
                          {product.description && (
                            <p className="text-yellow-700 dark:text-yellow-300 text-xs mt-1 line-clamp-1">
                              {product.description}
                            </p>
                          )}
                        </div>
                        <span className="text-yellow-600 dark:text-yellow-400 text-xs ml-2">
                          ⚠️ 重复
                        </span>
                      </div>
                    </div>
                  ))}
                  {crawlResult.duplicateProducts.length > 5 && (
                    <p className="text-yellow-600 dark:text-yellow-400 text-xs text-center">
                      还有 {crawlResult.duplicateProducts.length - 5} 个重复产品...
                    </p>
                  )}
                </div>
              </div>
            )}

            {crawlResult.errors && crawlResult.errors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                <h4 className="font-medium text-red-800 dark:text-red-200 mb-3">
                  错误详情 ({crawlResult.errors.length})
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {crawlResult.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-700 dark:text-red-300">
                      <span className="font-medium">{error.project}:</span> {error.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}; 