import { Component, ReactNode } from 'react';

export interface ErrorBoundaryProps {
  children: ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
}

export interface GenerationState {
  isGeneratingAll: boolean;
  generationProgress: number;
  currentGenerating: string;
  nextToGenerate: string;
  projectId: string;
  results?: Array<{
    templateName: string;
    status: 'success' | 'failed';
    error?: string;
  }>;
} 