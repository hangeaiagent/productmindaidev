import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 25个产品管理模板 - 中文版
const productTemplatesCN = [
  'PRD-产品需求文档', 'MRD-市场需求文档', 'BRD-商业需求文档',
  '竞品分析报告', '用户画像分析', '用户体验地图', '产品路线图',
  '功能优先级矩阵', 'SWOT分析', '商业模式画布', '价值主张画布',
  '用户故事地图', 'MVP定义文档', '产品度量指标', '产品发布计划',
  '产品运营策略', '用户反馈分析', '产品迭代计划', '技术架构文档',
  '数据分析报告', '产品测试方案', '上线检查清单', '产品复盘报告',
  '市场策略文档', '产品风险评估'
];

// 25个产品管理模板 - 英文版
const productTemplatesEN = [
  'PRD-Product Requirements Document', 'MRD-Market Requirements Document', 'BRD-Business Requirements Document',
  'Competitive Analysis Report', 'User Persona Analysis', 'User Experience Map', 'Product Roadmap',
  'Feature Priority Matrix', 'SWOT Analysis', 'Business Model Canvas', 'Value Proposition Canvas',
  'User Story Map', 'MVP Definition Document', 'Product Metrics', 'Product Launch Plan',
  'Product Operations Strategy', 'User Feedback Analysis', 'Product Iteration Plan', 'Technical Architecture Document',
  'Data Analysis Report', 'Product Testing Plan', 'Launch Checklist', 'Product Retrospective Report',
  'Market Strategy Document', 'Product Risk Assessment'
];

interface Project {
  id: string;
  name: string;
  description: string;
  primary_category: string;
  secondary_category: string;
  created_at: string;
}

// 生成模板内容
function generateTemplateContent(templateName: string, project: Project, language: string = 'zh'): string {
  const currentTime = new Date().toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US');
  const isZh = language === 'zh';
  const cleanName = project.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5\s]/g, '').trim();
  
  return `# ${templateName}

## ${isZh ? '📋 基本信息' : '📋 Basic Information'}
- **${isZh ? '产品名称' : 'Product Name'}**: ${cleanName}
- **${isZh ? '分类' : 'Category'}**: ${project.primary_category} > ${project.secondary_category}
- **${isZh ? '生成时间' : 'Generated Time'}**: ${currentTime}
- **${isZh ? '模板版本' : 'Template Version'}**: v1.0

## ${isZh ? '📖 模板说明' : '📖 Template Description'}
${isZh 
  ? `这是一个专业的${templateName}模板，专为${cleanName}项目定制。`
  : `This is a professional ${templateName} template customized for ${cleanName} project.`
}

## ${isZh ? '🎯 使用指南' : '🎯 Usage Guide'}
${isZh ? '1. 根据项目需求填写相关内容' : '1. Fill in relevant content according to project needs'}
${isZh ? '2. 参考示例进行调整和优化' : '2. Adjust and optimize with reference to examples'}
${isZh ? '3. 与团队成员共享和协作' : '3. Share and collaborate with team members'}

---
© 2025 ${isZh ? 'AI产品管理平台' : 'AI Product Management Platform'}
`;
}

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
  console.log('🚀 开始生成产品管理模板...');
  
  try {
    const { queryStringParameters } = event;
    const projectId = queryStringParameters?.id;
    const language = queryStringParameters?.lang || 'zh';
    const limit = parseInt(queryStringParameters?.limit || '10');
    
    // 验证语言参数
    if (!['zh', 'en'].includes(language)) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Unsupported language. Use "zh" or "en".' })
      };
    }
    
    let projects: Project[];
    
    if (projectId) {
      // 生成单个项目的模板
      const { data, error } = await supabase
        .from('user_projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (error || !data) {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ error: language === 'zh' ? '项目不存在' : 'Project not found' })
        };
      }
      
      projects = [data as Project];
    } else {
      // 获取所有项目
      const { data, error } = await supabase
        .from('user_projects')
        .select('*')
        .not('name', 'is', null)
        .not('name', 'eq', '')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        throw new Error(`获取项目数据失败: ${error.message}`);
      }
      
      projects = (data as Project[]) || [];
    }
    
    console.log(`📊 找到 ${projects.length} 个项目，语言: ${language}`);
    
    const templates = language === 'zh' ? productTemplatesCN : productTemplatesEN;
    const generatedTemplates: Array<{
      projectId: string;
      projectName: string;
      templateName: string;
      content: string;
    }> = [];
    
    for (const project of projects) {
      for (const template of templates) {
        try {
          const content = generateTemplateContent(template, project, language);
          
          generatedTemplates.push({
            projectId: project.id,
            projectName: project.name,
            templateName: template,
            content
          });
          
          console.log(`✅ 生成模板: ${project.name} - ${template}`);
        } catch (templateError) {
          console.error(`❌ 生成模板失败 ${project.id} - ${template}:`, templateError);
        }
      }
    }
    
    // 如果是单个项目，返回ZIP文件
    if (projectId && projects.length > 0) {
      const project = projects[0];
      const templates = language === 'zh' ? productTemplatesCN : productTemplatesEN;
      const templateContents = templates.map(template => ({
        name: template,
        content: generateTemplateContent(template, project, language)
      }));
      
      // 创建ZIP文件
      const JSZip = require('jszip');
      const zip = new JSZip();
      
      // 添加模板文件到ZIP
      templateContents.forEach(template => {
        zip.file(`${template.name}.md`, template.content);
      });
      
      // 生成ZIP文件
      const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${project.name}-templates.zip"`,
          'Cache-Control': 'public, max-age=3600'
        },
        body: zipContent.toString('base64'),
        isBase64Encoded: true
      };
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: `${language === 'zh' ? '中英双语' : 'Bilingual'} 模板生成完成`,
        language,
        statistics: {
          totalGenerated: generatedTemplates.length,
          totalProjects: projects.length,
          templatesPerProject: templates.length
        },
        templates: generatedTemplates.map(template => ({
          projectId: template.projectId,
          projectName: template.projectName,
          templateName: template.templateName,
          downloadUrl: `/.netlify/functions/generate-templates?id=${template.projectId}&template=${encodeURIComponent(template.templateName)}&lang=${language}`
        }))
      })
    };
    
  } catch (error) {
    console.error('❌ 生成失败:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: '模板生成失败 / Template generation failed',
        details: error instanceof Error ? error.message : String(error)
      })
    };
  }
}; 