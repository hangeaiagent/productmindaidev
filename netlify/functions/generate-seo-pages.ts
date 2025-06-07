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

interface Project {
  id: string;
  name: string;
  description: string;
  url: string;
  primary_category: string;
  secondary_category: string;
  created_at: string;
}

// 生成带下载功能的产品页面
function generateProductPageWithDownload(project: Project, language: string = 'zh', templates: any[]): string {
  const cleanName = project.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5\s]/g, '').trim();
  
  return `<!DOCTYPE html>
<html lang="${language === 'zh' ? 'zh-CN' : 'en-US'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${cleanName} - AI产品管理文档</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .info-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            border-left: 4px solid #3498db;
        }
        .template-list {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .template-item {
            background: white;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #e3f2fd;
            transition: all 0.3s ease;
        }
        .template-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .download-btn {
            background: #4CAF50;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            margin-top: 10px;
            transition: background 0.3s ease;
        }
        .download-btn:hover {
            background: #45a049;
        }
        .download-all-btn {
            background: #2196F3;
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin: 20px 0;
            width: 100%;
            transition: background 0.3s ease;
        }
        .download-all-btn:hover {
            background: #1976D2;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📋 ${cleanName}</h1>
        
        <div class="info-grid">
            <div class="info-card">
                <h3>🎯 产品信息</h3>
                <p><strong>名称：</strong>${project.name}</p>
                <p><strong>分类：</strong>${project.primary_category || '未分类'}</p>
                <p><strong>子分类：</strong>${project.secondary_category || '无'}</p>
                <p><strong>描述：</strong>${project.description || '暂无描述'}</p>
            </div>
            
            <div class="info-card">
                <h3>📊 模板统计</h3>
                <p><strong>可用模板：</strong>${templates.length} 个</p>
                <p><strong>类型：</strong>产品管理文档</p>
                <p><strong>格式：</strong>Markdown</p>
                <p><strong>语言：</strong>中文 / English</p>
            </div>
        </div>

        <button class="download-all-btn" onclick="downloadAll('${language}')">
            🚀 一键下载全部模板 (${templates.length}个)
        </button>

        <h2>📚 可用模板列表</h2>
        <div class="template-list">
            ${templates.map(template => `
                <div class="template-item">
                    <h4>📄 ${template.name_zh || template.name_en || 'Unknown Template'}</h4>
                    <p style="color: #666; font-size: 14px;">${template.description || '专业的产品管理模板'}</p>
                    <p style="color: #888; font-size: 12px;">分类: ${template.category || '通用'}</p>
                    <p style="color: #999; font-size: 10px;">模板ID: ${template.id}</p>
                    <button class="download-btn" onclick="downloadTemplate('${template.id}', '${(template.name_zh || template.name_en || 'template').replace(/'/g, "\\'")}', '${language}')">
                        📥 下载此模板
                    </button>
                </div>
            `).join('')}
        </div>

        <div style="margin-top: 40px; padding: 20px; background: #f8f9fa; border-radius: 6px; text-align: center;">
            <p><strong>© 2025 AI产品管理平台</strong></p>
            <p>专业的产品管理文档解决方案</p>
        </div>
    </div>

    <script>
        const projectData = {
            id: '${project.id}',
            name: '${cleanName}',
            description: '${project.description || ''}',
            primaryCategory: '${project.primary_category || ''}',
            secondaryCategory: '${project.secondary_category || ''}'
        };
        
        const dbTemplates = ${JSON.stringify(templates)};
        console.log('模板已加载:', dbTemplates.length, '个');
        
        // 内容格式化函数
        function formatOutput(rawContent) {
            if (!rawContent) return '';
            
            let content = rawContent;
            
            // 简单的JSON解析循环
            for (let i = 0; i < 5; i++) {
                if (typeof content === 'string') {
                    try {
                        const parsed = JSON.parse(content);
                        if (parsed && typeof parsed === 'object' && parsed.content) {
                            content = parsed.content;
                            continue;
                        }
                    } catch (e) {
                        break;
                    }
                }
                
                if (typeof content === 'object' && content !== null && content.content) {
                    content = content.content;
                    continue;
                }
                
                break;
            }
            
            // 转换为字符串并清理
            if (typeof content !== 'string') {
                content = String(content);
            }
            
            // 简单的字符串清理
            content = content
                .split('\\\\n').join('\\n')
                .split('\\\\"').join('"')
                .split('\\\\t').join('\\t')
                .trim();
            
            return content;
        }
        
        // 生成安全文件名
        function generateSafeFileName(templateName, templateId) {
            let baseName = templateName || templateId || 'template';
            
            // 简单的字符清理，不使用复杂正则表达式
            let safeName = '';
            for (let i = 0; i < baseName.length; i++) {
                const char = baseName[i];
                // 保留中文、英文、数字、空格、连字符、下划线
                if (/[a-zA-Z0-9\\u4e00-\\u9fa5\\s\\-_]/.test(char)) {
                    safeName += char;
                }
            }
            
            // 空格转下划线
            safeName = safeName.split(' ').join('_');
            
            // 限制长度
            if (safeName.length > 50) {
                safeName = safeName.substring(0, 50);
            }
            
            return safeName + '.md';
        }
        
        // 添加版权信息
        function addCopyrightFooter(content) {
            const currentTime = new Date().toLocaleString('zh-CN');
            const footer = '\\n\\n---\\n\\n' +
                          '**文档信息**\\n\\n' +
                          '- 生成时间: ' + currentTime + '\\n' +
                          '- 产品名称: ' + projectData.name + '\\n' +
                          '- 项目分类: ' + (projectData.primaryCategory || '未分类') + '\\n\\n' +
                          '*本文档由AI产品管理平台自动生成，仅供参考使用。*\\n\\n' +
                          '© 2025 AI产品管理平台 - 专业的产品管理文档解决方案';
            
            return content + footer;
        }
        
        // 下载单个模板
        async function downloadTemplate(templateId, templateName, language) {
            console.log('🔄 下载模板请求:');
            console.log('  - templateId:', templateId);
            console.log('  - templateName:', templateName);
            console.log('  - language:', language);
            
            try {
                // 1. 尝试从数据库获取内容
                const dbUrl = '/.netlify/functions/get-template-content' +
                    '?projectId=' + encodeURIComponent(projectData.id) +
                    '&templateId=' + encodeURIComponent(templateId) +
                    '&lang=' + encodeURIComponent(language);
                
                console.log('📡 数据库查询URL:', dbUrl);
                
                const dbRes = await fetch(dbUrl);
                let finalContent = '';
                
                if (dbRes.ok) {
                    const data = await dbRes.json();
                    console.log('📊 数据库响应:', data);
                    if (data.success && data.content) {
                        console.log('✅ 从数据库获取内容成功');
                        finalContent = data.content;
                    } else {
                        console.log('❌ 数据库无有效内容');
                    }
                } else {
                    console.log('❌ 数据库查询失败，状态码:', dbRes.status);
                }
                
                // 2. 如果数据库没有内容且不是默认模板，尝试AI生成
                if (!finalContent && !templateId.startsWith('default-')) {
                    console.log('🤖 数据库无内容，尝试AI生成');
                    const aiRes = await fetch('/.netlify/functions/generate-ai-template', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            projectId: projectData.id,
                            projectName: projectData.name,
                            projectDescription: projectData.description,
                            primaryCategory: projectData.primaryCategory,
                            secondaryCategory: projectData.secondaryCategory,
                            templateId: templateId,
                            language: language
                        })
                    });
                    
                    if (aiRes.ok) {
                        const aiData = await aiRes.json();
                        console.log('🤖 AI响应:', aiData);
                        if (aiData.success && aiData.content) {
                            console.log('✅ AI生成成功');
                            finalContent = aiData.content;
                            
                            // 异步保存到数据库（仅对真实模板ID）
                            if (!templateId.startsWith('default-')) {
                                fetch('/.netlify/functions/save-template-content', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        projectId: projectData.id,
                                        templateId: templateId,
                                        content: finalContent,
                                        language: language
                                    })
                                }).catch(err => console.log('💾 保存失败:', err));
                            }
                        } else {
                            console.log('❌ AI生成失败');
                        }
                    } else {
                        console.log('❌ AI请求失败，状态码:', aiRes.status);
                    }
                }
                
                // 3. 如果还是没有内容，生成默认模板
                if (!finalContent) {
                    console.log('📝 使用默认模板生成');
                    finalContent = generateDefaultTemplate(templateName, language);
                }
                
                // 4. 格式化内容并下载
                const formattedContent = formatOutput(finalContent);
                const contentWithFooter = addCopyrightFooter(formattedContent);
                const fileName = generateSafeFileName(templateName, templateId);
                
                console.log('💾 准备下载文件:', fileName);
                downloadFile(fileName, contentWithFooter);
                
            } catch (error) {
                console.error('❌ 下载错误:', error);
                alert('下载失败: ' + error.message);
            }
        }
        
        // 批量下载所有模板
        function downloadAll(language) {
            console.log('批量下载', dbTemplates.length, '个模板');
            
            dbTemplates.forEach((template, index) => {
                setTimeout(() => {
                    const templateName = template.name_zh || template.name_en || 'Template';
                    downloadTemplate(template.id, templateName, language);
                }, index * 1000); // 每秒下载一个，避免服务器压力
            });
        }
        
        // 生成默认模板内容
        function generateDefaultTemplate(templateName, language) {
            const currentTime = new Date().toLocaleString('zh-CN');
            
            return '# ' + templateName + '\\n\\n' +
                   '## 基本信息\\n\\n' +
                   '- **产品名称**: ' + projectData.name + '\\n' +
                   '- **模板类型**: ' + templateName + '\\n' +
                   '- **生成时间**: ' + currentTime + '\\n' +
                   '- **版本**: v1.0\\n\\n' +
                   '## 模板说明\\n\\n' +
                   '这是一个专业的' + templateName + '模板，专为' + projectData.name + '项目定制。\\n\\n' +
                   '## 使用指南\\n\\n' +
                   '1. 根据项目需求填写相关内容\\n' +
                   '2. 参考示例进行调整和优化\\n' +
                   '3. 与团队成员共享和协作\\n' +
                   '4. 定期更新和维护文档内容\\n\\n' +
                   '## 模板内容\\n\\n' +
                   '请在此处填写' + templateName + '的具体内容。\\n\\n' +
                   '这个模板为您提供了标准的框架结构，您可以根据项目的实际需求进行调整和完善。\\n\\n' +
                   '---\\n\\n' +
                   '*此模板由AI产品管理平台生成，请根据实际需求进行调整。*';
        }
        
        // 文件下载函数
        function downloadFile(filename, content) {
            console.log('下载文件:', filename);
            
            try {
                const element = document.createElement('a');
                const file = new Blob([content], { type: 'text/markdown;charset=utf-8' });
                element.href = URL.createObjectURL(file);
                element.download = filename;
                element.style.display = 'none';
                
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
                
                URL.revokeObjectURL(element.href);
                console.log('下载完成:', filename);
                
            } catch (error) {
                console.error('下载失败:', error);
                alert('下载失败: ' + filename);
            }
        }
    </script>
</body>
</html>`;
}

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
  console.log('🚀 开始生成简化版SEO页面...');
  
  try {
    const { queryStringParameters } = event;
    const projectId = queryStringParameters?.id;
    const language = queryStringParameters?.lang || 'zh';

    if (!projectId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: '缺少项目ID参数' })
      };
    }

    console.log('📦 获取项目数据:', projectId);

    // 查询项目信息
    const { data: project, error } = await supabase
      .from('user_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error || !project) {
      console.log('❌ 项目未找到:', error);
      return {
        statusCode: 404,
        body: JSON.stringify({ error: '项目未找到' })
      };
    }

    console.log('✅ 成功获取项目:', project.name);

    // 查询可用的模板
    let templateList: Array<{
      id: string;
      name_zh: string;
      name_en: string;
      description: string;
      category: string;
    }> = [];
    
    try {
      const { data: templates, error: templateError } = await supabase
        .from('templates')
        .select('id, name_zh, name_en, description_zh, description_en, category')
        .eq('is_active', true)
        .order('name_zh');

      if (templateError) {
        console.log('⚠️ 模板查询错误:', templateError);
      } else {
        // 处理数据库模板，选择合适的描述字段
        templateList = (templates || []).map(t => ({
          id: t.id,
          name_zh: t.name_zh,
          name_en: t.name_en,
          description: language === 'zh' ? (t.description_zh || t.description_en || '专业的产品管理模板') : (t.description_en || t.description_zh || 'Professional product management template'),
          category: t.category || '产品管理'
        }));
        console.log('📋 从数据库获取到模板数量:', templateList.length);
      }
    } catch (dbError) {
      console.log('⚠️ 数据库连接问题:', dbError);
    }

    // 如果数据库查询失败或没有模板，使用默认模板列表
    if (templateList.length === 0) {
      console.log('📋 使用默认模板列表');
      templateList = productTemplatesCN.map((name, index) => ({
        id: `default-${index + 1}`,
        name_zh: name,
        name_en: name,
        description: `专业的${name}模板`,
        category: '产品管理'
      }));
    }

    console.log('📊 最终模板数量:', templateList.length);

    // 生成页面
    const pageHtml = generateProductPageWithDownload(project, language, templateList);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300'
      },
      body: pageHtml
    };

  } catch (error) {
    console.error('❌ 生成页面失败:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: '服务器错误',
        details: error instanceof Error ? error.message : '未知错误'
      })
    };
  }
}; 