import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

interface CrawlResult {
  success: boolean;
  summary?: {
    totalFound: number;
    totalCrawled: number;
    successfullySaved: number;
    errors: number;
  };
  savedProjects?: any[];
  errors?: Array<{ project: string; error: string }>;
  error?: string;
}

export const YCProjectCrawler: React.FC = () => {
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlResult, setCrawlResult] = useState<CrawlResult | null>(null);

  const handleCrawlYCProjects = async () => {
    setIsCrawling(true);
    setCrawlResult(null);
    
    try {
      toast.loading('开始采集YC项目...', { id: 'yc-crawl' });
      
      const response = await fetch('/.netlify/functions/yc-projects-crawler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result: CrawlResult = await response.json();
      setCrawlResult(result);

      if (result.success && result.summary) {
        toast.success(
          `采集完成！找到${result.summary.totalFound}个项目，成功保存${result.summary.successfullySaved}个`,
          { id: 'yc-crawl', duration: 5000 }
        );
      } else {
        toast.error(result.error || '采集失败', { id: 'yc-crawl' });
      }
    } catch (error) {
      console.error('YC crawl error:', error);
      toast.error('采集过程中出现错误', { id: 'yc-crawl' });
      setCrawlResult({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      });
    } finally {
      setIsCrawling(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">
          YC项目采集器
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
          自动采集Y Combinator最新批次的所有项目信息，包括项目名称、描述和官方网站。
          <br />
          <span className="text-xs text-blue-600 dark:text-blue-400">
            目标批次：Winter 2025, Spring 2025, Summer 2024, Winter 2024
          </span>
        </p>
        
        <button
          onClick={handleCrawlYCProjects}
          disabled={isCrawling}
          className={`
            inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white
            ${isCrawling 
              ? 'bg-blue-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }
          `}
        >
          {isCrawling ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              采集中...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              开始采集YC项目
            </>
          )}
        </button>
      </div>

      {/* 显示采集结果 */}
      {crawlResult && (
        <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
            采集结果
          </h4>
          
          {crawlResult.success && crawlResult.summary ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {crawlResult.summary.totalFound}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    发现项目
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {crawlResult.summary.totalCrawled}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">
                    成功解析
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {crawlResult.summary.successfullySaved}
                  </div>
                  <div className="text-xs text-purple-600 dark:text-purple-400">
                    保存成功
                  </div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {crawlResult.summary.errors}
                  </div>
                  <div className="text-xs text-red-600 dark:text-red-400">
                    错误数量
                  </div>
                </div>
              </div>

              {/* 显示部分保存的项目 */}
              {crawlResult.savedProjects && crawlResult.savedProjects.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    已保存项目示例 (前10个)：
                  </h5>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {crawlResult.savedProjects.map((project, index) => (
                      <div key={index} className="text-sm bg-gray-50 dark:bg-gray-600 p-2 rounded">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {project.name}
                        </div>
                        {project.description && (
                          <div className="text-gray-600 dark:text-gray-300 text-xs mt-1">
                            {project.description.length > 100 
                              ? `${project.description.substring(0, 100)}...` 
                              : project.description
                            }
                          </div>
                        )}
                        {project.official_website && (
                          <div className="text-blue-600 dark:text-blue-400 text-xs mt-1">
                            <a href={project.official_website} target="_blank" rel="noopener noreferrer">
                              {project.official_website}
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 显示错误信息 */}
              {crawlResult.errors && crawlResult.errors.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                    错误信息 (前5个)：
                  </h5>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {crawlResult.errors.map((error, index) => (
                      <div key={index} className="text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded text-red-700 dark:text-red-300">
                        <span className="font-medium">{error.project}:</span> {error.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-red-600 dark:text-red-400">
              <div className="font-medium">采集失败</div>
              <div className="text-sm mt-1">{crawlResult.error}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 