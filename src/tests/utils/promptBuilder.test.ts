import { describe, it, expect } from 'vitest';
import { buildPrompt } from '../../utils/promptBuilder';
import type { Template } from '../../types';

describe('buildPrompt', () => {
  const mockTemplate: Template = {
    id: '1',
    category_id: '1',
    name_en: 'Test Template',
    name_zh: '测试模板',
    description_en: 'Test Description',
    description_zh: '测试描述',
    prompt_content: 'Base prompt content',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  it('should build Chinese prompt correctly', () => {
    const prompt = buildPrompt(mockTemplate, '测试产品', '这是一个测试产品描述', 'zh');
    
    expect(prompt).toContain('产品名称：测试产品');
    expect(prompt).toContain('产品描述：这是一个测试产品描述');
    expect(prompt).toContain('Base prompt content');
  });

  it('should build English prompt correctly', () => {
    const prompt = buildPrompt(mockTemplate, 'Test Product', 'This is a test product description', 'en');
    
    expect(prompt).toContain('Product Name: Test Product');
    expect(prompt).toContain('Product Description: This is a test product description');
    expect(prompt).toContain('Base prompt content');
  });
});