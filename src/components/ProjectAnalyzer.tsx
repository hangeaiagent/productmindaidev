import React, { useState } from 'react';
import { ProjectAnalysisService } from '../services/projectAnalysisService';
import { toast } from 'react-hot-toast';

const projectAnalysisService = new ProjectAnalysisService();

interface ProjectAnalyzerProps {
  onAnalysisComplete?: (result: any) => void;
}

export const ProjectAnalyzer: React.FC<ProjectAnalyzerProps> = ({ onAnalysisComplete }) => {
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!inputText.trim()) {
      toast.error('请输入要分析的文本');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await projectAnalysisService.analyzeText(inputText);
      if (result) {
        toast.success('分析完成并保存到数据库');
        onAnalysisComplete?.(result);
      } else {
        toast.error('分析失败，请重试');
      }
    } catch (error) {
      toast.error('分析过程中出现错误');
      console.error('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div></div>
  );
}; 