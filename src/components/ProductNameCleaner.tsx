import React, { useState } from 'react';

interface CleanupResult {
  id: string;
  originalName: string;
  cleanedName: string;
  changes: {
    name: boolean;
    name_zh: boolean;
    name_en: boolean;
  };
}

interface CleanupResponse {
  success: boolean;
  summary: {
    totalFound: number;
    totalCleaned: number;
    errors: number;
  };
  cleanedProjects: CleanupResult[];
  errors: Array<{ project: string; error: string }>;
  cleanupPatterns: string[];
}

export default function ProductNameCleaner() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CleanupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCleanup = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/.netlify/functions/cleanup-product-names', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: CleanupResponse = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '清理失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          🗑️ 产品名称清理器
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          清理产品名称中的冗余信息，如"使用入口地址 Ai网站最新工具和软件app下载"等
        </p>
      </div>
      
      <div className="p-6 space-y-4">
        {/* 清理按钮 */}
        <div className="flex items-center gap-4">
          <button 
            onClick={handleCleanup} 
            disabled={isLoading}
            className={`px-4 py-2 rounded-md font-medium flex items-center gap-2 ${
              isLoading 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            {isLoading ? '🔄' : '🗑️'}
            {isLoading ? '清理中...' : '开始清理'}
          </button>
          
          {isLoading && (
            <div className="text-sm text-gray-500">
              正在扫描和清理产品名称...
            </div>
          )}
        </div>

        {/* 错误信息 */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              ⚠️ <span className="font-medium">清理失败</span>
            </div>
            <p className="text-red-600 mt-1">{error}</p>
          </div>
        )}

        {/* 清理结果 */}
        {result && (
          <div className="space-y-4">
            {/* 统计信息 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {result.summary.totalFound}
                </div>
                <div className="text-sm text-blue-700">找到项目</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {result.summary.totalCleaned}
                </div>
                <div className="text-sm text-green-700">已清理</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {result.summary.errors}
                </div>
                <div className="text-sm text-red-700">错误</div>
              </div>
            </div>

            {/* 清理模式 */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">清理的文本模式：</h4>
              <div className="flex flex-wrap gap-2">
                {result.cleanupPatterns.map((pattern, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded border">
                    {pattern}
                  </span>
                ))}
              </div>
            </div>

            {/* 成功清理的项目 */}
            {result.cleanedProjects.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  ✅ 已清理的项目 ({result.cleanedProjects.length})
                </h4>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {result.cleanedProjects.map((project) => (
                    <div key={project.id} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="font-medium text-red-600">原名称：</span>
                          <span className="line-through text-gray-500">{project.originalName}</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium text-green-600">新名称：</span>
                          <span className="text-green-700">{project.cleanedName}</span>
                        </div>
                        <div className="flex gap-1 mt-1">
                          {project.changes.name && <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded">name</span>}
                          {project.changes.name_zh && <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded">name_zh</span>}
                          {project.changes.name_en && <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded">name_en</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 错误信息 */}
            {result.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2 text-red-600">
                  ⚠️ 清理错误 ({result.errors.length})
                </h4>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {result.errors.map((error, index) => (
                    <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="text-sm">
                        <span className="font-medium">项目：</span> {error.project}
                      </div>
                      <div className="text-sm text-red-600">
                        <span className="font-medium">错误：</span> {error.error}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 无需清理的情况 */}
            {result.summary.totalFound === 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-700">
                  ✅ <span className="font-medium">所有产品名称都很干净！</span>
                </div>
                <p className="text-green-600 mt-1">没有找到需要清理的产品名称。</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 