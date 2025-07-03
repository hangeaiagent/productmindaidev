import React, { useState, useRef } from 'react';
import { Lightbulb, Cpu, Code, Download, Loader2, Sparkles, Settings, FileText, CheckCircle, Image, FileDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppContext } from '../context/AppContext';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface AIProductAnalysis {
  minimumViableProduct: {
    title: string;
    description: string;
    coreFeatures: string[];
    targetUsers: string[];
    businessModel: string;
  };
  technicalSolution: {
    recommendedModels: Array<{
      name: string;
      provider: string;
      reason: string;
      pricing: string;
    }>;
    keyAlgorithms: string[];
    mcpTools: Array<{
      name: string;
      purpose: string;
      implementation: string;
    }>;
    architecture: string[];
  };
  developmentModules: Array<{
    moduleName: string;
    functionality: string;
    priority: 'High' | 'Medium' | 'Low';
    estimatedTime: string;
    cursorPrompts: {
      fileName: string;
      content: string;
    }[];
  }>;
}

interface ProgressStep {
  step: string;
  message: string;
  completed: boolean;
  progress: number;
  data?: any;
}

interface Content {
  [key: string]: {
    [key: string]: string;
  };
}

const AIProductIdeaGenerator: React.FC = () => {
  const [requirement, setRequirement] = useState('');
  const [analysis, setAnalysis] = useState<AIProductAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [streamingMode, setStreamingMode] = useState(true);
  
  // 添加ref用于导出
  const exportRef = useRef<HTMLDivElement>(null);
  
  // 使用全局语言状态
  const { language } = useAppContext();

  // 多语言内容
  const content: Content = {
    en: {
      title: 'AI Product Idea Generator',
      subtitle: 'Enter your AI product creative requirements, and the system will automatically provide you with:',
      inputLabel: 'Please enter your AI product creative requirements',
      inputPlaceholder: 'For example: I want to create an AI-powered fitness app that can customize workout plans based on user fitness levels and goals...',
      feature1: '1. Minimum Viable Product (MVP) Recommendations',
      feature2: '2. AI Technical Solutions (Model Selection, Key Algorithms, MCP Tool Recommendations)',
      feature3: '3. Product Development Modules & Feature Breakdown with Corresponding Cursor Prompt Files',
      generateBtn: 'Generate Analysis',
      generateStreamBtn: 'Generate Analysis (Streaming)',
      generating: 'Analyzing...',
      mvpTitle: 'Minimum Viable Product (MVP)',
      techSolutionTitle: 'AI Technical Solution',
      devModulesTitle: 'Development Modules',
      downloadPrompts: 'Download Cursor Prompts',
      exportMarkdown: 'Export Markdown',
      exportPNG: 'Export PNG',
      coreFeatures: 'Core Features',
      targetUsers: 'Target Users',
      businessModel: 'Business Model',
      recommendedModels: 'Recommended AI Models',
      keyAlgorithms: 'Key Algorithms',
      mcpTools: 'MCP Tools',
      architecture: 'System Architecture',
      priority: 'Priority',
      estimatedTime: 'Estimated Time',
      functionality: 'Functionality',
      progressTitle: 'Analysis Progress',
      streamingMode: 'Streaming Mode',
      normalMode: 'Normal Mode',
      exportSuccess: 'Export successful!',
      exportError: 'Export failed, please try again',
      technicalTitle: 'AI Technical Solution',
      developmentTitle: 'Development Modules'
    },
    zh: {
      title: 'AI产品创意生成器',
      subtitle: '请输入您的AI产品创意需求，系统将自动为您提供：',
      inputLabel: '请输入AI产品创意需求',
      inputPlaceholder: '例如：我想做一个基于AI的健身应用，能够根据用户的身体状况和目标定制锻炼计划...',
      feature1: '1、最小产品原型建议',
      feature2: '2、AI技术方案（大模型选择、关键算法、MCP选择建议）',
      feature3: '3、产品开发模块及功能细分及对应的Cursor提示词文件',
      generateBtn: '生成分析',
      generateStreamBtn: '生成分析（流式）',
      generating: '分析中...',
      mvpTitle: '最小可行产品 (MVP)',
      techSolutionTitle: 'AI技术方案',
      devModulesTitle: '开发模块',
      downloadPrompts: '下载Cursor提示词',
      exportMarkdown: '导出Markdown',
      exportPNG: '导出PNG图片',
      coreFeatures: '核心功能',
      targetUsers: '目标用户',
      businessModel: '商业模式',
      recommendedModels: '推荐AI模型',
      keyAlgorithms: '关键算法',
      mcpTools: 'MCP工具',
      architecture: '系统架构',
      priority: '优先级',
      estimatedTime: '预估时间',
      functionality: '功能描述',
      progressTitle: '分析进度',
      streamingMode: '流式模式',
      normalMode: '普通模式',
      exportSuccess: '导出成功！',
      exportError: '导出失败，请重试',
      technicalTitle: 'AI技术方案',
      developmentTitle: '开发模块'
    }
  };

  const t = content[language];

  const handleGenerate = async () => {
    if (!requirement.trim()) return;

    setIsLoading(true);
    setAnalysis(null);
    setProgressSteps([]);
    setCurrentProgress(0);

    try {
      if (streamingMode) {
        await handleStreamingGenerate();
      } else {
        await handleNormalGenerate();
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error(language === 'zh' ? '分析失败，请重试' : 'Analysis failed, please try again');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStreamingGenerate = async () => {
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const apiUrl = isDevelopment 
      ? 'http://localhost:3000/api/ai-product-analysis-stream'
      : '/api/ai-product-analysis-stream';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requirement: requirement.trim(),
        language
      }),
    });

    if (!response.ok) {
      throw new Error('流式分析失败');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('无法读取响应流');
    }

    let partialAnalysis: Partial<AIProductAnalysis> = {};

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            setIsLoading(false);
            toast.success(language === 'zh' ? '分析完成！' : 'Analysis completed!');
            return;
          }

          try {
            const progressData = JSON.parse(data);
            handleProgressUpdate(progressData, partialAnalysis);
          } catch (parseError) {
            console.error('解析进度数据失败:', parseError);
          }
        }
      }
    }
  };

  const handleProgressUpdate = (progressData: any, partialAnalysis: Partial<AIProductAnalysis>) => {
    const { type, step, message, progress, data } = progressData;
    
    setCurrentProgress(progress || 0);

    // 更新进度步骤
    setProgressSteps(prev => {
      const newSteps = [...prev];
      const existingIndex = newSteps.findIndex(s => s.step === step);
      
      if (existingIndex >= 0) {
        newSteps[existingIndex] = {
          ...newSteps[existingIndex],
          completed: step.includes('_complete'),
          progress: progress || 0,
          data
        };
      } else {
        newSteps.push({
          step,
          message: message || (data && typeof data === 'object' && data.message) || '',
          completed: step.includes('_complete'),
          progress: progress || 0,
          data
        });
      }
      
      return newSteps;
    });

    // 根据步骤更新分析结果
    if (step === 'mvp_complete' && data) {
      partialAnalysis.minimumViableProduct = data.minimumViableProduct || data;
      setAnalysis(prev => ({ ...prev, minimumViableProduct: data.minimumViableProduct || data } as AIProductAnalysis));
    } else if (step === 'tech_complete' && data) {
      partialAnalysis.technicalSolution = data.technicalSolution || data;
      setAnalysis(prev => ({ ...prev, technicalSolution: data.technicalSolution || data } as AIProductAnalysis));
    } else if (step === 'modules_complete' && data) {
      partialAnalysis.developmentModules = data.developmentModules || data;
      setAnalysis(prev => ({ ...prev, developmentModules: data.developmentModules || data } as AIProductAnalysis));
    } else if (step === 'complete' && data) {
      setAnalysis(data);
    }
  };

  const handleNormalGenerate = async () => {
      const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const apiUrl = isDevelopment 
        ? 'http://localhost:3000/api/ai-product-analysis'
        : '/api/ai-product-analysis';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requirement: requirement.trim(),
          language
        }),
      });

      if (!response.ok) {
        throw new Error('分析失败');
      }

      const result = await response.json();
      setAnalysis(result);
      toast.success(language === 'zh' ? '分析完成！' : 'Analysis completed!');
  };

  const downloadCursorPrompts = () => {
    if (!analysis || !analysis.developmentModules || !Array.isArray(analysis.developmentModules)) return;

    const prompts = analysis.developmentModules.flatMap(module => 
      module.cursorPrompts && Array.isArray(module.cursorPrompts) 
        ? module.cursorPrompts.map(prompt => ({
        fileName: prompt.fileName,
        content: prompt.content
      }))
        : []
    );

    // 创建ZIP文件内容
    const zipContent = prompts.map(prompt => 
      `// ${prompt.fileName}\n${prompt.content}`
    ).join('\n\n' + '='.repeat(50) + '\n\n');

    const blob = new Blob([zipContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cursor-prompts.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 导出Markdown格式
  // 这个函数已被exportToMarkdown替代，保留以防其他地方使用
  const exportMarkdownLegacy = async () => {
    if (!analysis) return;

    try {
      let markdown = `# ${t.title}\n\n`;
      markdown += `**${t.inputLabel}:** ${requirement}\n\n`;

      // MVP部分
      if (analysis.minimumViableProduct) {
        markdown += `## ${t.mvpTitle}\n\n`;
        markdown += `### ${analysis.minimumViableProduct.title}\n\n`;
        markdown += `${analysis.minimumViableProduct.description}\n\n`;
        
        markdown += `### ${t.coreFeatures}\n\n`;
        analysis.minimumViableProduct.coreFeatures?.forEach(feature => {
          markdown += `- ${feature}\n`;
        });
        markdown += '\n';

        markdown += `### ${t.targetUsers}\n\n`;
        analysis.minimumViableProduct.targetUsers?.forEach(user => {
          markdown += `- ${user}\n`;
        });
        markdown += '\n';

        markdown += `### ${t.businessModel}\n\n`;
        markdown += `${analysis.minimumViableProduct.businessModel}\n\n`;
      }

      // 技术方案部分
      if (analysis.technicalSolution) {
        markdown += `## ${t.techSolutionTitle}\n\n`;
        
        markdown += `### ${t.recommendedModels}\n\n`;
        analysis.technicalSolution.recommendedModels?.forEach(model => {
          markdown += `#### ${model.name} (${model.provider})\n\n`;
          markdown += `${model.reason}\n\n`;
          markdown += `**定价:** ${model.pricing}\n\n`;
        });

        markdown += `### ${t.keyAlgorithms}\n\n`;
        analysis.technicalSolution.keyAlgorithms?.forEach(algorithm => {
          markdown += `- ${algorithm}\n`;
        });
        markdown += '\n';

        markdown += `### ${t.mcpTools}\n\n`;
        analysis.technicalSolution.mcpTools?.forEach(tool => {
          markdown += `#### ${tool.name}\n\n`;
          markdown += `**用途:** ${tool.purpose}\n\n`;
          markdown += `**实现:** ${tool.implementation}\n\n`;
        });

        markdown += `### ${t.architecture}\n\n`;
        analysis.technicalSolution.architecture?.forEach(item => {
          markdown += `- ${item}\n`;
        });
        markdown += '\n';
      }

      // 开发模块部分
      if (analysis.developmentModules) {
        markdown += `## ${t.devModulesTitle}\n\n`;
        
        analysis.developmentModules.forEach((module, index) => {
          markdown += `### ${index + 1}. ${module.moduleName}\n\n`;
          markdown += `**${t.priority}:** ${module.priority}\n\n`;
          markdown += `**${t.estimatedTime}:** ${module.estimatedTime}\n\n`;
          markdown += `**${t.functionality}:** ${module.functionality}\n\n`;
          
          if (module.cursorPrompts && module.cursorPrompts.length > 0) {
            markdown += `**Cursor Prompt Files:**\n\n`;
            module.cursorPrompts.forEach(prompt => {
              markdown += `- ${prompt.fileName}\n`;
            });
            markdown += '\n';
          }
        });
      }

      // 创建并下载文件
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-product-analysis-${Date.now()}.md`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(t.exportSuccess);
    } catch (error) {
      console.error('Export markdown error:', error);
      toast.error(t.exportError);
    }
  };

  // 导出PNG图片
  const exportPNG = async () => {
    if (!exportRef.current || !analysis) return;

    try {
      // 临时隐藏导出按钮
      const exportButtons = exportRef.current.querySelectorAll('.export-buttons');
      exportButtons.forEach(btn => {
        (btn as HTMLElement).style.display = 'none';
      });

      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: exportRef.current.scrollWidth,
        height: exportRef.current.scrollHeight
      });

      // 恢复导出按钮显示
      exportButtons.forEach(btn => {
        (btn as HTMLElement).style.display = '';
      });

      // 创建并下载图片
      const link = document.createElement('a');
      link.download = `ai-product-analysis-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();

      toast.success(t.exportSuccess);
    } catch (error) {
      console.error('Export PNG error:', error);
      toast.error(t.exportError);
      
      // 确保恢复按钮显示
      const exportButtons = exportRef.current?.querySelectorAll('.export-buttons');
      exportButtons?.forEach(btn => {
        (btn as HTMLElement).style.display = '';
      });
    }
  };

  const exportToMarkdown = async () => {
    if (!analysis) {
      toast.error(t.exportError);
      return;
    }

    try {
      let markdownContent = `# ${t.title}\n\n`;
      markdownContent += `**生成时间:** ${new Date().toLocaleString()}\n\n`;
      markdownContent += `**需求描述:** ${requirement}\n\n`;

      // MVP部分
      if (analysis.minimumViableProduct) {
        markdownContent += `## ${t.mvpTitle}\n\n`;
        markdownContent += `### ${analysis.minimumViableProduct.title}\n\n`;
        markdownContent += `${analysis.minimumViableProduct.description}\n\n`;
        
        markdownContent += `**核心功能:**\n`;
        if (analysis.minimumViableProduct.coreFeatures && Array.isArray(analysis.minimumViableProduct.coreFeatures)) {
          analysis.minimumViableProduct.coreFeatures.forEach(feature => {
            markdownContent += `- ${feature}\n`;
          });
        }
        markdownContent += `\n`;
        
        markdownContent += `**目标用户:**\n`;
        if (analysis.minimumViableProduct.targetUsers && Array.isArray(analysis.minimumViableProduct.targetUsers)) {
          analysis.minimumViableProduct.targetUsers.forEach(user => {
            markdownContent += `- ${user}\n`;
          });
        }
        markdownContent += `\n`;
        
        markdownContent += `**商业模式:** ${analysis.minimumViableProduct.businessModel}\n\n`;
      }

      // 技术方案部分
      if (analysis.technicalSolution) {
        markdownContent += `## ${t.technicalTitle}\n\n`;
        
        markdownContent += `### 推荐模型\n\n`;
        if (analysis.technicalSolution.recommendedModels && Array.isArray(analysis.technicalSolution.recommendedModels)) {
          analysis.technicalSolution.recommendedModels.forEach(model => {
            markdownContent += `#### ${model.name} (${model.provider})\n`;
            markdownContent += `- **推荐理由:** ${model.reason}\n`;
            markdownContent += `- **价格:** ${model.pricing}\n\n`;
          });
        }
        
        markdownContent += `### 关键算法\n\n`;
        if (analysis.technicalSolution.keyAlgorithms && Array.isArray(analysis.technicalSolution.keyAlgorithms)) {
          analysis.technicalSolution.keyAlgorithms.forEach(algorithm => {
            markdownContent += `- ${algorithm}\n`;
          });
        }
        markdownContent += `\n`;
        
        markdownContent += `### MCP工具\n\n`;
        if (analysis.technicalSolution.mcpTools && Array.isArray(analysis.technicalSolution.mcpTools)) {
          analysis.technicalSolution.mcpTools.forEach(tool => {
            markdownContent += `#### ${tool.name}\n`;
            markdownContent += `- **用途:** ${tool.purpose}\n`;
            markdownContent += `- **实现:** ${tool.implementation}\n\n`;
          });
        }
        
        markdownContent += `### 架构组件\n\n`;
        if (analysis.technicalSolution.architecture && Array.isArray(analysis.technicalSolution.architecture)) {
          analysis.technicalSolution.architecture.forEach(component => {
            markdownContent += `- ${component}\n`;
          });
        }
        markdownContent += `\n`;
      }

      // 开发模块部分
      if (analysis.developmentModules && Array.isArray(analysis.developmentModules)) {
        markdownContent += `## ${t.developmentTitle}\n\n`;
        
        analysis.developmentModules.forEach((module, index) => {
          markdownContent += `### ${index + 1}. ${module.moduleName}\n\n`;
          markdownContent += `- **功能:** ${module.functionality}\n`;
          markdownContent += `- **优先级:** ${module.priority}\n`;
          markdownContent += `- **预估时间:** ${module.estimatedTime}\n\n`;
          
          if (module.cursorPrompts && Array.isArray(module.cursorPrompts) && module.cursorPrompts.length > 0) {
            markdownContent += `**Cursor提示词:**\n\n`;
            module.cursorPrompts.forEach(prompt => {
              markdownContent += `#### ${prompt.fileName}\n`;
              markdownContent += `\`\`\`\n${prompt.content}\n\`\`\`\n\n`;
            });
          }
        });
      }

      // 创建并下载文件
      const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `AI产品创意分析_${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(t.exportSuccess);
    } catch (error) {
      console.error('导出Markdown失败:', error);
      toast.error(t.exportError);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-4 mx-auto">
          <Lightbulb className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">{t.title}</h2>
        <p className="text-gray-600 mb-6">{t.subtitle}</p>
        
        {/* Features List */}
        <div className="text-left max-w-2xl mx-auto space-y-2 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span>{t.feature1}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-blue-500" />
            <span>{t.feature2}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Code className="w-4 h-4 text-green-500" />
            <span>{t.feature3}</span>
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t.inputLabel}
        </label>
        <textarea
          value={requirement}
          onChange={(e) => setRequirement(e.target.value)}
          placeholder={t.inputPlaceholder}
          className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
          disabled={isLoading}
        />
        
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            {requirement.length}/1000 字符
            </div>
            
            {/* 模式切换 */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setStreamingMode(!streamingMode)}
                className={`text-xs px-3 py-1 rounded-full transition-colors duration-200 ${
                  streamingMode 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {streamingMode ? t.streamingMode : t.normalMode}
              </button>
            </div>
          </div>
          
          <button
            onClick={handleGenerate}
            disabled={isLoading || !requirement.trim()}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t.generating}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{streamingMode ? t.generateStreamBtn : t.generateBtn}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress Section */}
      {isLoading && streamingMode && (
        <div className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Loader2 className="w-5 h-5 text-blue-600 mr-2 animate-spin" />
            {t.progressTitle}
          </h3>
          
          {/* 总体进度条 */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>总体进度</span>
              <span>{currentProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${currentProgress}%` }}
              ></div>
            </div>
          </div>

          {/* 步骤列表 */}
          <div className="space-y-3">
            {progressSteps.map((step, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  step.completed 
                    ? 'bg-green-500 text-white' 
                    : step.step.includes('_start') || step.step === 'start'
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {step.completed ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <span className="text-xs font-bold">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${step.completed ? 'text-green-700' : 'text-gray-700'}`}>
                    {step.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div ref={exportRef} className="space-y-8">
          {/* Export Buttons */}
          <div className="export-buttons flex justify-end space-x-3 mb-6">
            <button
              onClick={exportToMarkdown}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <FileDown className="w-4 h-4" />
              <span>{t.exportMarkdown}</span>
            </button>
            <button
              onClick={exportPNG}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
            >
              <Image className="w-4 h-4" />
              <span>{t.exportPNG}</span>
            </button>
          </div>

          {/* MVP Section */}
          {analysis.minimumViableProduct && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 animate-fadeIn">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Lightbulb className="w-5 h-5 text-blue-600 mr-2" />
              {t.mvpTitle}
                {streamingMode && <CheckCircle className="w-5 h-5 text-green-500 ml-2" />}
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">{analysis.minimumViableProduct.title}</h4>
                <p className="text-gray-600 mb-4">{analysis.minimumViableProduct.description}</p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <h5 className="font-medium text-gray-800 mb-2">{t.coreFeatures}</h5>
                  <ul className="space-y-1 text-sm text-gray-600">
                      {analysis.minimumViableProduct.coreFeatures && Array.isArray(analysis.minimumViableProduct.coreFeatures) && analysis.minimumViableProduct.coreFeatures.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h5 className="font-medium text-gray-800 mb-2">{t.targetUsers}</h5>
                  <ul className="space-y-1 text-sm text-gray-600">
                      {analysis.minimumViableProduct.targetUsers && Array.isArray(analysis.minimumViableProduct.targetUsers) && analysis.minimumViableProduct.targetUsers.map((user, index) => (
                      <li key={index} className="flex items-start">
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                        {user}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h5 className="font-medium text-gray-800 mb-2">{t.businessModel}</h5>
                  <p className="text-sm text-gray-600">{analysis.minimumViableProduct.businessModel}</p>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Technical Solution Section */}
          {analysis.technicalSolution && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 animate-fadeIn">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Cpu className="w-5 h-5 text-green-600 mr-2" />
              {t.techSolutionTitle}
                {streamingMode && <CheckCircle className="w-5 h-5 text-green-500 ml-2" />}
            </h3>
            
            <div className="space-y-6">
              {/* Recommended Models */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">{t.recommendedModels}</h4>
                <div className="grid gap-3">
                    {analysis.technicalSolution.recommendedModels && Array.isArray(analysis.technicalSolution.recommendedModels) && analysis.technicalSolution.recommendedModels.map((model, index) => (
                    <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-medium text-gray-800">{model.name}</h5>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          {model.provider}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{model.reason}</p>
                      <p className="text-xs text-gray-500">{model.pricing}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Algorithms */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">{t.keyAlgorithms}</h4>
                <div className="flex flex-wrap gap-2">
                    {analysis.technicalSolution.keyAlgorithms && Array.isArray(analysis.technicalSolution.keyAlgorithms) && analysis.technicalSolution.keyAlgorithms.map((algorithm, index) => (
                    <span key={index} className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                      {algorithm}
                    </span>
                  ))}
                </div>
              </div>

              {/* MCP Tools */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">{t.mcpTools}</h4>
                <div className="grid gap-3">
                    {analysis.technicalSolution.mcpTools && Array.isArray(analysis.technicalSolution.mcpTools) && analysis.technicalSolution.mcpTools.map((tool, index) => (
                    <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                      <h5 className="font-medium text-gray-800 mb-1">{tool.name}</h5>
                      <p className="text-sm text-gray-600 mb-2">{tool.purpose}</p>
                      <p className="text-xs text-gray-500">{tool.implementation}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Architecture */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">{t.architecture}</h4>
                <div className="space-y-2">
                    {analysis.technicalSolution.architecture && Array.isArray(analysis.technicalSolution.architecture) && analysis.technicalSolution.architecture.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Settings className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Development Modules Section */}
          {analysis.developmentModules && Array.isArray(analysis.developmentModules) && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <Code className="w-5 h-5 text-purple-600 mr-2" />
                {t.devModulesTitle}
                  {streamingMode && <CheckCircle className="w-5 h-5 text-green-500 ml-2" />}
              </h3>
              <button
                onClick={downloadCursorPrompts}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
              >
                <Download className="w-4 h-4" />
                <span>{t.downloadPrompts}</span>
              </button>
            </div>
            
            <div className="space-y-4">
              {analysis.developmentModules.map((module, index) => (
                <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold text-gray-800">{module.moduleName}</h4>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(module.priority)}`}>
                        {module.priority}
                      </span>
                      <span className="text-xs text-gray-500">{module.estimatedTime}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{module.functionality}</p>
                  
                  <div>
                    <h5 className="text-xs font-medium text-gray-700 mb-2">Cursor Prompt Files:</h5>
                    <div className="flex flex-wrap gap-2">
                      {module.cursorPrompts && Array.isArray(module.cursorPrompts) && module.cursorPrompts.map((prompt, promptIndex) => (
                        <span key={promptIndex} className="flex items-center space-x-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          <FileText className="w-3 h-3" />
                          <span>{prompt.fileName}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIProductIdeaGenerator; 