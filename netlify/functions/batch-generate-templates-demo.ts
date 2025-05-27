import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from '@netlify/functions';

// 默认用户ID
const DEFAULT_USER_ID = 'afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1';

// 模拟项目数据
const mockProjects = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'AI智能客服系统',
    description: '基于大语言模型的智能客服解决方案，提供7x24小时在线服务',
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'RaqiAI设计营销平台',
    description: '为企业提供设计营销和编码服务助力业务成功',
    created_at: '2024-01-02T00:00:00Z'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: '智能数据分析工具',
    description: '帮助企业快速分析业务数据，生成可视化报告',
    created_at: '2024-01-03T00:00:00Z'
  }
];

// 模拟模板数据
const mockTemplates = [
  {
    id: 'template-001',
    name_zh: 'PRD-产品需求文档',
    name_en: 'PRD-Product Requirements Document',
    prompt_content: '请根据项目信息生成详细的产品需求文档，包含产品概述、功能需求、技术架构等内容',
    category: { name_zh: '产品规划', name_en: 'Product Planning' }
  },
  {
    id: 'template-002',
    name_zh: 'MRD-市场需求文档',
    name_en: 'MRD-Market Requirements Document',
    prompt_content: '请根据项目信息生成市场需求文档，包含市场分析、用户画像、竞品分析等内容',
    category: { name_zh: '市场分析', name_en: 'Market Analysis' }
  },
  {
    id: 'template-003',
    name_zh: '技术架构文档',
    name_en: 'Technical Architecture Document',
    prompt_content: '请根据项目信息生成技术架构文档，包含系统架构、技术选型、部署方案等内容',
    category: { name_zh: '技术规划', name_en: 'Technical Planning' }
  },
  {
    id: 'template-004',
    name_zh: '商业模式画布',
    name_en: 'Business Model Canvas',
    prompt_content: '请根据项目信息生成商业模式画布，包含价值主张、客户细分、收入来源等内容',
    category: { name_zh: '商业策略', name_en: 'Business Strategy' }
  },
  {
    id: 'template-005',
    name_zh: '用户体验地图',
    name_en: 'User Experience Map',
    prompt_content: '请根据项目信息生成用户体验地图，包含用户旅程、触点分析、痛点识别等内容',
    category: { name_zh: '用户体验', name_en: 'User Experience' }
  }
];

// 模拟现有版本数据 (部分项目已有部分模板)
const mockExistingVersions = [
  { template_id: 'template-001', project_id: '550e8400-e29b-41d4-a716-446655440001', is_active: true },
  { template_id: 'template-002', project_id: '550e8400-e29b-41d4-a716-446655440001', is_active: true },
];

interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

interface Template {
  id: string;
  name_zh: string;
  name_en: string;
  prompt_content: string;
  category: {
    name_zh: string;
    name_en: string;
  };
}

interface ExistingVersion {
  template_id: string;
  project_id: string;
  is_active: boolean;
}

// 构建提示词
function buildPrompt(template: Template, projectName: string, projectDescription: string, language: string = 'zh'): string {
  const isZh = language === 'zh';
  const templateName = isZh ? template.name_zh : template.name_en;
  const categoryName = isZh ? template.category.name_zh : template.category.name_en;
  
  return `作为专业的产品经理，请根据以下模板和项目信息生成详细的${templateName}：

项目信息：
- 项目名称：${projectName}
- 项目描述：${projectDescription}
- 模板类型：${templateName}
- 分类：${categoryName}

模板要求：
${template.prompt_content}

请用${isZh ? '中文' : '英文'}输出，确保内容专业、详细、可操作。格式要求：
1. 使用Markdown格式
2. 包含清晰的标题和章节
3. 提供具体的实施建议
4. 结合项目特点定制内容

请开始生成：`;
}

// 模拟AI生成内容
async function generateMockContent(template: Template, project: Project, language: string = 'zh'): Promise<string> {
  const isZh = language === 'zh';
  const templateName = isZh ? template.name_zh : template.name_en;
  const categoryName = isZh ? template.category.name_zh : template.category.name_en;
  
  // 模拟生成延迟
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return `# ${templateName}

## ${isZh ? '项目概述' : 'Project Overview'}
**${isZh ? '项目名称' : 'Project Name'}**: ${project.name}
**${isZh ? '项目描述' : 'Project Description'}**: ${project.description}
**${isZh ? '模板分类' : 'Template Category'}**: ${categoryName}

## ${isZh ? '详细内容' : 'Detailed Content'}

### ${isZh ? '1. 背景分析' : '1. Background Analysis'}
${isZh 
  ? `根据${project.name}项目的特点，我们需要从多个维度进行深入分析。该项目聚焦于${project.description}，具有良好的市场前景和技术可行性。`
  : `Based on the characteristics of the ${project.name} project, we need to conduct in-depth analysis from multiple dimensions. This project focuses on ${project.description}, with good market prospects and technical feasibility.`
}

### ${isZh ? '2. 核心功能' : '2. Core Features'}
${isZh 
  ? `- 智能化处理能力\n- 用户友好的界面设计\n- 高性能的系统架构\n- 完善的数据安全保障`
  : `- Intelligent processing capabilities\n- User-friendly interface design\n- High-performance system architecture\n- Comprehensive data security assurance`
}

### ${isZh ? '3. 实施建议' : '3. Implementation Recommendations'}
${isZh 
  ? `1. **第一阶段**: 完成核心功能开发和测试\n2. **第二阶段**: 用户体验优化和性能调优\n3. **第三阶段**: 市场推广和用户反馈收集\n4. **第四阶段**: 持续迭代和功能扩展`
  : `1. **Phase 1**: Complete core function development and testing\n2. **Phase 2**: User experience optimization and performance tuning\n3. **Phase 3**: Market promotion and user feedback collection\n4. **Phase 4**: Continuous iteration and feature expansion`
}

### ${isZh ? '4. 预期效果' : '4. Expected Results'}
${isZh 
  ? `通过实施${templateName}，预期能够显著提升项目的成功率和用户满意度，为企业带来可观的商业价值。`
  : `Through the implementation of ${templateName}, it is expected to significantly improve the project success rate and user satisfaction, bringing considerable business value to the enterprise.`
}

## ${isZh ? '结论' : 'Conclusion'}
${isZh 
  ? `${project.name}项目具备良好的发展潜力，建议按照本文档的规划进行实施，并持续关注市场反馈进行优化调整。`
  : `The ${project.name} project has good development potential. It is recommended to implement according to the planning in this document and continuously pay attention to market feedback for optimization and adjustment.`
}

---
${isZh ? '生成时间' : 'Generated Time'}: ${new Date().toISOString()}
${isZh ? '模板版本' : 'Template Version'}: v1.0
${isZh ? '语言' : 'Language'}: ${isZh ? '中文' : 'English'}
`;
}

// 批量生成模板版本（演示版本）
async function batchGenerateTemplatesDemo(userId: string, language: string = 'zh'): Promise<any> {
  console.log(`🚀 开始演示批量生成模板，用户ID: ${userId}, 语言: ${language}`);
  
  try {
    // 1. 获取模拟项目数据
    const projects = mockProjects;
    console.log(`📊 找到 ${projects.length} 个项目`);

    // 2. 获取模拟模板数据
    const templates = mockTemplates;
    console.log(`📝 找到 ${templates.length} 个模板`);

    // 3. 获取现有版本数据
    const existingVersions = mockExistingVersions;
    console.log(`🔍 找到 ${existingVersions.length} 个现有版本`);

    // 4. 确定需要生成的模板版本
    const toGenerate: Array<{ project: Project; template: Template }> = [];
    
    for (const project of projects) {
      for (const template of templates) {
        // 检查是否已存在活跃版本
        const hasActiveVersion = existingVersions.some(
          (version: ExistingVersion) => 
            version.template_id === template.id && 
            version.project_id === project.id && 
            version.is_active
        );

        if (!hasActiveVersion) {
          toGenerate.push({ project, template });
        }
      }
    }

    console.log(`⏳ 需要生成 ${toGenerate.length} 个模板版本`);

    if (toGenerate.length === 0) {
      return {
        success: true,
        message: '所有项目的模板版本都已生成',
        statistics: {
          totalProjects: projects.length,
          totalTemplates: templates.length,
          totalGenerated: 0,
          totalSkipped: projects.length * templates.length
        }
      };
    }

    // 5. 批量生成模板版本
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      generatedItems: [] as Array<{
        projectName: string;
        templateName: string;
        contentPreview: string;
      }>
    };

    for (let i = 0; i < toGenerate.length; i++) {
      const { project, template } = toGenerate[i];
      const templateName = language === 'zh' ? template.name_zh : template.name_en;
      
      console.log(`🔄 生成 ${i + 1}/${toGenerate.length}: ${project.name} - ${templateName}`);

      try {
        // 生成内容
        const generatedContent = await generateMockContent(template, project, language);
        
        // 模拟保存到数据库的过程
        await new Promise(resolve => setTimeout(resolve, 50));
        
        results.success++;
        results.generatedItems.push({
          projectName: project.name,
          templateName: templateName,
          contentPreview: generatedContent.substring(0, 200) + '...'
        });
        
        console.log(`✅ 成功生成: ${project.name} - ${templateName}`);

      } catch (error) {
        const errorMessage = `${project.name} - ${templateName}: ${error instanceof Error ? error.message : '未知错误'}`;
        results.failed++;
        results.errors.push(errorMessage);
        console.error(`❌ 生成失败: ${errorMessage}`);
      }
    }

    return {
      success: true,
      message: '演示批量生成完成',
      statistics: {
        totalProjects: projects.length,
        totalTemplates: templates.length,
        totalToGenerate: toGenerate.length,
        successCount: results.success,
        failedCount: results.failed,
        totalGenerated: results.success,
        totalSkipped: (projects.length * templates.length) - toGenerate.length
      },
      generatedItems: results.generatedItems,
      errors: results.errors
    };

  } catch (error) {
    console.error('❌ 演示批量生成失败:', error);
    throw error;
  }
}

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
  // 设置CORS头
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const { queryStringParameters } = event;
    const userId = queryStringParameters?.user_id || DEFAULT_USER_ID;
    const language = queryStringParameters?.lang || 'zh';

    console.log(`🚀 演示批量生成模板请求: 用户=${userId}, 语言=${language}`);

    // 验证语言参数
    if (!['zh', 'en'].includes(language)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Unsupported language. Use "zh" or "en".' 
        })
      };
    }

    // 执行演示批量生成
    const result = await batchGenerateTemplatesDemo(userId, language);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('❌ 演示批量生成模板失败:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '演示批量生成模板失败',
        details: error instanceof Error ? error.message : String(error)
      })
    };
  }
}; 