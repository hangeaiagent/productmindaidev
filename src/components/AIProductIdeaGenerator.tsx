import React, { useState } from 'react';
import { Lightbulb, Cpu, Code, Download, Loader2, Sparkles, Settings, FileText, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppContext } from '../context/AppContext';

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
      normalMode: 'Normal Mode'
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
      normalMode: '普通模式'
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
    const { step, data, progress } = progressData;
    
    setCurrentProgress(progress);

    // 更新进度步骤
    setProgressSteps(prev => {
      const newSteps = [...prev];
      const existingIndex = newSteps.findIndex(s => s.step === step);
      
      if (existingIndex >= 0) {
        newSteps[existingIndex] = {
          ...newSteps[existingIndex],
          completed: step.includes('_complete'),
          progress,
          data
        };
      } else {
        newSteps.push({
          step,
          message: data.message || '',
          completed: step.includes('_complete'),
          progress,
          data
        });
      }
      
      return newSteps;
    });

    // 根据步骤更新分析结果
    if (step === 'mvp_complete') {
      partialAnalysis.minimumViableProduct = data;
      setAnalysis(prev => ({ ...prev, minimumViableProduct: data } as AIProductAnalysis));
    } else if (step === 'tech_complete') {
      partialAnalysis.technicalSolution = data;
      setAnalysis(prev => ({ ...prev, technicalSolution: data } as AIProductAnalysis));
    } else if (step === 'modules_complete') {
      partialAnalysis.developmentModules = data;
      setAnalysis(prev => ({ ...prev, developmentModules: data } as AIProductAnalysis));
    } else if (step === 'complete') {
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
    if (!analysis) return;

    const prompts = analysis.developmentModules.flatMap(module => 
      module.cursorPrompts.map(prompt => ({
        fileName: prompt.fileName,
        content: prompt.content
      }))
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
        <div className="space-y-8">
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
                      {analysis.minimumViableProduct.coreFeatures.map((feature, index) => (
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
                      {analysis.minimumViableProduct.targetUsers.map((user, index) => (
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
                  {analysis.technicalSolution.recommendedModels.map((model, index) => (
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
                  {analysis.technicalSolution.keyAlgorithms.map((algorithm, index) => (
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
                  {analysis.technicalSolution.mcpTools.map((tool, index) => (
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
                  {analysis.technicalSolution.architecture.map((item, index) => (
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
          {analysis.developmentModules && (
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
                      {module.cursorPrompts.map((prompt, promptIndex) => (
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