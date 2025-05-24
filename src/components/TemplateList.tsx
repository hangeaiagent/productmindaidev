import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import * as Icons from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { useTemplates } from '../hooks/useTemplates';
import { logger } from '../utils/logger';
import OutputDisplay from './OutputDisplay';
import OutputHistory from './OutputHistory';
import type { Template, TemplateCategory } from '../types';

const TemplateList = () => {
  const { 
    templates,
    categories,
    language, 
    currentProject,
    selectedTemplate,
    setSelectedTemplate,
    generateOutput,
    isLoading,
    loadProjectHistory,
    streamingOutput,
    setStreamingOutput,
    setModelSettingsOpen
  } = useAppContext();
  
  const [expandedTemplates, setExpandedTemplates] = useState(new Set());
  const [selectedVersions, setSelectedVersions] = useState({});
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState(null);
  const [deletingVersion, setDeletingVersion] = useState(null);
  const [editingVersion, setEditingVersion] = useState(null);
  const [selectedVersionContent, setSelectedVersionContent] = useState(null);
  const [loadingTemplateId, setLoadingTemplateId] = useState(null);

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentCategory = searchParams.get('category');

  const filteredTemplates = useMemo(() => {
    if (!currentCategory) return templates;
    return templates.filter(template => template.category_id === currentCategory);
  }, [templates, currentCategory]);

  const groupedTemplates = useMemo(() => {
    const sortedCategories = [...categories].sort((a, b) => a.no - b.no);
    
    const initialGroups = sortedCategories.reduce((acc, category) => {
      acc[category.id] = {
        category,
        templates: []
      };
      return acc;
    }, {} as Record<string, { category: TemplateCategory; templates: Template[] }>);

    const result = filteredTemplates.reduce((acc, template) => {
      const category = categories.find(c => c.id === template.category_id);
      if (!category) return acc;
      
      acc[category.id].templates.push(template);
      return acc;
    }, initialGroups);

    // 对每个分类中的模板进行排序
    Object.values(result).forEach((group: { category: TemplateCategory; templates: Template[] }) => {
      group.templates.sort((a: Template, b: Template) => (a.no || 0) - (b.no || 0));
    });

    return result;
  }, [filteredTemplates, categories]);

  const toggleTemplateExpand = (templateId: string) => {
    setExpandedTemplates(prev => {
      const next = new Set(prev);
      if (next.has(templateId)) {
        next.delete(templateId);
      } else {
        next.add(templateId);
      }
      return next;
    });
  };

  const handleVersionSelect = (templateId: string, version: string) => {
    setSelectedVersions(prev => ({
      ...prev,
      [templateId]: version
    }));
  };

  const getCategoryIcon = (categoryId: string): keyof typeof Icons => {
    const iconMap: Record<string, keyof typeof Icons> = {
      'strategy': 'Compass',
      'research': 'Search', 
      'planning': 'Calendar',
      'analysis': 'BarChart',
      'growth': 'TrendingUp',
      'design': 'Palette',
      'development': 'Code'
    };
    return iconMap[categoryId] || 'FileText';
  };

  const handleTemplateSelect = async (template: Template) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    
    if (!currentProject || !currentProject.description) {
      const errorMsg = language === 'zh' ? 
        '请先选择或创建一个项目，并输入产品描述' : 
        'Please select or create a project and enter a product description';
      setError(errorMsg);
      setErrorType('other');
      setShowErrorDialog(true);
      return;
    }

    setError(null);
    setErrorType(null);
    
    const templateWithProject = {
      ...template,
      currentProject: currentProject
    };
    
    logger.log('选择模板', {
      templateId: template.id,
      templateName: language === 'zh' ? template.name_zh : template.name_en,
      currentProject: currentProject
    });
    
    setSelectedTemplate(templateWithProject);
  };

  const handleGenerateClick = (template: Template) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    if (template.versions?.some(v => v.is_active)) {
      setPendingTemplate(template);
      setShowConfirmDialog(true);
    } else {
      setPendingTemplate(template);
      setShowConfirmDialog(true);
    }
  };

  const handleConfirmGenerate = () => {
    if (pendingTemplate) {
      setLoadingTemplateId(pendingTemplate.id);
      generateOutput(currentProject!.description, pendingTemplate)
        .then(async () => {
          const { data: updatedTemplate, error: templateError } = await supabase
            .from('templates')
            .select(`
              *,
              versions:template_versions (
                id,
                input_content,
                output_content,
                created_at,
                updated_at,
                created_by,
                is_active,
                version_number
              )
            `)
            .eq('id', pendingTemplate.id)
            .single();

          if (templateError) throw templateError;

          if (updatedTemplate) {
            const templateWithProject = {
              ...updatedTemplate,
              currentProject: currentProject
            };
            
            setSelectedTemplate(templateWithProject);
            
            if (currentProject?.id) {
              loadProjectHistory(currentProject.id);
            }
          }
        })
        .catch((err) => {
          const errorMsg = err instanceof Error ? err.message : 
            language === 'zh' ? '生成过程中发生错误' : 'Error during generation';
          
          if (errorMsg.includes('API密钥') || errorMsg.includes('API key')) {
            setErrorType('api_key');
          } else {
            setErrorType('other');
          }
          
          setError(errorMsg);
          setShowErrorDialog(true);
        })
        .finally(() => {
          setLoadingTemplateId(null);
        });
    }
    setShowConfirmDialog(false);
    setPendingTemplate(null);
  };

  const handleVersionClick = async (version: any) => {
    try {
      const template = templates.find(t => 
        t.versions?.some(v => v.id === version.id)
      );
      
      if (template) {
        setSelectedTemplate(template);
        setStreamingOutput(version.output_content);
      }
      
      const { error } = await supabase
        .from('template_versions')
        .update({ is_active: true })
        .eq('id', version.id);

      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载版本失败');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleSaveVersion = async () => {
    if (!editingVersion) return;

    try {
      const { error } = await supabase
        .from('template_versions')
        .update({ input_content: editingVersion.content })
        .eq('id', editingVersion.id);

      if (error) throw error;

      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存版本失败');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleErrorConfirm = () => {
    if (errorType === 'api_key') {
      setModelSettingsOpen(true);
    }
    setShowErrorDialog(false);
  };

  const handleDeleteClick = (e: React.MouseEvent, templateId: string, versionId: string) => {
    e.stopPropagation();
    setDeletingVersion({
      templateId,
      versionId
    });
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingVersion) return;

    try {
      const { error: deleteError } = await supabase
        .from('template_versions')
        .delete()
        .eq('id', deletingVersion.versionId)
        .eq('is_active', false);

      if (deleteError) throw deleteError;
      
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除版本失败');
      setTimeout(() => setError(null), 3000);
    } finally {
      setShowDeleteDialog(false);
      setDeletingVersion(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 输出显示区域 */}
      <div className="p-6 bg-gray-50 border-b">
        {(isLoading || streamingOutput) && (
          <OutputDisplay 
            isLoading={isLoading}
            output={streamingOutput}
            template={selectedTemplate}
            language={language}
          />
        )}
        <OutputHistory />
      </div>

      {/* 模板列表区域 */}
      <div className="p-6 overflow-y-auto flex-1">
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {language === 'zh' ? '确认生成内容' : 'Confirm Generation'}
            </h3>
            <p className="text-gray-700 mb-4">
              {pendingTemplate?.versions?.some(v => v.is_active)
                ? (language === 'zh'
                  ? '该模板已有生成内容，是否确认重新生成？'
                  : 'This template already has generated content. Do you want to regenerate?')
                : (language === 'zh'
                  ? '是否确认使用该模板生成内容？'
                  : 'Do you want to generate content using this template?')
              }
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setPendingTemplate(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                {language === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmGenerate}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                {language === 'zh' ? '确认' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showErrorDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {language === 'zh' ? '出错了' : 'Error'}
            </h3>
            <p className="text-gray-700 mb-4">{error}</p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowErrorDialog(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                {language === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button
                onClick={handleErrorConfirm}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                {errorType === 'api_key' 
                  ? (language === 'zh' ? '前往设置' : 'Go to Settings')
                  : (language === 'zh' ? '确定' : 'OK')
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {language === 'zh' ? '确认删除' : 'Confirm Delete'}
            </h3>
            <p className="text-gray-700 mb-4">
              {language === 'zh' 
                ? '确定要删除这个版本吗？此操作无法撤销。' 
                : 'Are you sure you want to delete this version? This action cannot be undone.'}
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeletingVersion(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                {language === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                {language === 'zh' ? '删除' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && !showErrorDialog && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="space-y-8">
        {Object.values(groupedTemplates)
          .filter(group => group.templates.length > 0)
          .map(({ category, templates }) => {
            const hasActiveVersions = templates.some(t => t.versions?.some(v => v.is_active));
            return (
          <div key={category.id} className="space-y-4">
            <button
              onClick={() => {
                setSearchParams({ category: category.id });
              }}
              className={`w-full text-left text-lg font-semibold border-b pb-2 ${
                hasActiveVersions ? 'text-indigo-600' : 'text-gray-700'
              } hover:text-indigo-700`}
            >
              {language === 'zh' ? category.name_zh : category.name_en}
            </button>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => {
                const IconComponent = Icons[getCategoryIcon(template.category_id)];
                const isSelected = selectedTemplate?.id === template.id;
                
                return (
                  <div
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className={`${
                      currentProject && template.versions?.length ? 'bg-indigo-50/30' : 'bg-white'
                    } p-5 rounded-lg border ${
                      isSelected 
                        ? 'border-indigo-500 shadow-md' 
                        : 'border-gray-200 shadow-sm hover:shadow-md'
                    } transition-all cursor-pointer group`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-4">
                        <div className={`p-2 rounded-lg ${
                          template.versions?.some(v => v.is_active)
                            ? (isSelected ? 'bg-indigo-600 text-white' : 'bg-indigo-200 text-indigo-700')
                            : (isSelected ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-700')
                        }`}>
                          <IconComponent className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <h4 className={`font-medium flex items-center space-x-2 ${
                            isSelected ? 'text-indigo-600' : 'text-gray-900 group-hover:text-indigo-600'
                          } transition-colors relative`}>
                            <span>{language === 'zh' ? template.name_zh : template.name_en}</span>
                            {loadingTemplateId === template.id && (
                              <div className="absolute -right-6 top-1/2 -translate-y-1/2">
                                <div className="animate-spin h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full transition-all duration-300"></div>
                              </div>
                            )}
                          </h4>
                          <p className="mt-1 text-sm text-gray-500">
                            {language === 'zh' ? template.description_zh : template.description_en}
                          </p>
                          <div className="mt-2 text-xs text-gray-400">
                            {format(new Date(template.created_at), 'yyyy-MM-dd HH:mm')}
                          </div>
                          {currentProject && template.versions?.length > 0 && (
                            <div className="mt-1 text-xs text-indigo-600 font-medium">
                              {language === 'zh' ? '已有模板版本' : 'Has template versions'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateClick(template);
                        }}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          template.versions?.some(v => v.is_active)
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                            : 'bg-gray-600 text-white hover:bg-gray-700'
                        }`}
                      >
                        {language === 'zh' ? '生成内容' : 'Generate Content'}
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (currentProject && isAuthenticated) {
                            toggleTemplateExpand(template.id);
                          }
                        }}
                        className={`p-1 ${
                          template.versions?.some(v => v.is_active)
                            ? 'text-indigo-400 hover:text-indigo-600'
                            : 'text-gray-400 hover:text-gray-600'
                        } ${(!currentProject || !isAuthenticated) ? 'hidden' : ''}`}
                      >
                        {expandedTemplates.has(template.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    
                    {expandedTemplates.has(template.id) && currentProject && isAuthenticated && (
                      <div className="mt-4 border-t pt-4 space-y-2">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">
                          {language === 'zh' ? '版本历史' : 'Version History'}
                        </h5>
                        {template.versions?.length > 0 ? (
                          template.versions
                            .sort((a, b) => b.version_number - a.version_number)
                            .map((version) => (
                           <div
                             key={version.id}
                             className={`flex items-center justify-between p-2 rounded ${
                               version.is_active 
                                 ? 'bg-indigo-50 border border-indigo-100' 
                                 : 'bg-gray-50 border border-gray-100'
                             }`}
                           >
                            <div
                              className="flex items-center space-x-2"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  if (template) {
                                    setSelectedTemplate(template);
                                  }
                                  
                                  setStreamingOutput(version.output_content);
                                  
                                  const { error } = await supabase
                                    .from('template_versions')
                                    .update({ is_active: true })
                                    .eq('id', version.id);

                                  if (error) throw error;
                                } catch (err) {
                                  setError(err instanceof Error ? err.message : '加载版本失败');
                                  setTimeout(() => setError(null), 3000);
                                }
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                                  <span>V{version.version_number}</span>
                                  {version.is_active && (
                                    <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded">
                                      {language === 'zh' ? '当前使用' : 'Current'}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {format(new Date(version.created_at), 'yyyy-MM-dd HH:mm')}
                                </div>
                              </div>
                            </div>
                            {!version.is_active && (
                              <button
                                onClick={(e) => {
                                  handleDeleteClick(e, template.id, version.id);
                                }}
                                className="p-1 text-gray-400 hover:text-red-600"
                                title={language === 'zh' ? '删除版本' : 'Delete Version'}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))) : (
                          <div className="text-sm text-gray-500 text-center py-2">
                            {language === 'zh' ? '暂无版本记录' : 'No version history'}
                          </div>
                        )}
                        
                        {editingVersion && (
                          <div className="mt-4 border-t pt-4">
                            <div className="mb-4">
                              <textarea
                                value={editingVersion.content}
                                onChange={(e) => setEditingVersion({
                                  ...editingVersion,
                                  content: e.target.value
                                })}
                                className="w-full h-48 p-2 border rounded-md"
                              />
                            </div>
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => setEditingVersion(null)}
                                className="px-3 py-1 text-gray-600 hover:text-gray-800"
                              >
                                {language === 'zh' ? '取消' : 'Cancel'}
                              </button>
                              <button
                                onClick={handleSaveVersion}
                                className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                              >
                                {language === 'zh' ? '保存' : 'Save'}
                              </button>
                            </div>
                          </div>
                        )}

                        {selectedVersionContent && !editingVersion && (
                          <div className="mt-4 border-t pt-4">
                            <div className="prose max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {selectedVersionContent}
                              </ReactMarkdown>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      </div>
      </div>
    </div>
  );
};

export default TemplateList;