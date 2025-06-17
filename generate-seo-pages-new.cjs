const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
dotenv.config();

// Supabase配置
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

// 验证环境变量
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 错误: 缺少必需的环境变量');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 配置
const OUTPUT_DIR = './static-pages';
const PUBLIC_BASE_URL = 'https://productmindai.com';

/**
 * 获取模板分类及模板
 */
async function getTemplateCategoriesWithTemplates(projectId) {
  console.log(`[🔍 LOG] 开始为项目 ${projectId} 获取模板和分类...`);

  const { data: categoriesWithTemplates, error: categoriesError } = await supabase
    .from('template_categories')
    .select(`
      id,
      name_zh,
      name_en,
      templates (
        id,
        name_zh,
        name_en,
        description_zh,
        description_en
      )
    `)
    .eq('isshow', 1);

  if (categoriesError) {
    console.error('[❌ LOG] 获取分类和模板失败:', categoriesError);
    throw new Error('获取分类和模板失败');
  }

  const { data: versions, error: versionsError } = await supabase
    .from('template_versions')
    .select('template_id')
    .eq('project_id', projectId);

  if (versionsError) {
    console.error('[❌ LOG] 获取项目已生成版本失败:', versionsError);
  }

  const generatedTemplateIds = new Set((versions || []).map(v => v.template_id));

  const result = categoriesWithTemplates.map(category => ({
    id: category.id,
    name_zh: category.name_zh,
    name_en: category.name_en,
    templates: category.templates.map(template => ({
      ...template,
      category_name_zh: category.name_zh,
      category_name_en: category.name_en,
      status: generatedTemplateIds.has(template.id) ? 'generated' : 'not_generated'
    }))
  })).filter(category => category.templates.length > 0);

  console.log(`[✅ LOG] 处理完成，得到 ${result.length} 个分类`);
  return result;
}

/**
 * 生成模板分类网格
 */
function generateTemplateCategoryGrid(categoriesWithTemplates, lang = 'zh') {
  if (!categoriesWithTemplates || categoriesWithTemplates.length === 0) {
    return `<p class="no-categories">${lang === 'zh' ? '暂无可用的模板分类' : 'No template categories available'}</p>`;
  }
  
  return categoriesWithTemplates.map(category => {
    const categoryName = lang === 'zh' ? category.name_zh : category.name_en;
    return `
      <div class="category-card">
        <h3 class="category-name">${categoryName}</h3>
        <p class="category-count">${category.templates.length} ${lang === 'zh' ? '个模板' : 'templates'}</p>
      </div>
    `;
  }).join('');
}

/**
 * 生成模板网格
 */
function generateTemplateGrid(categoriesWithTemplates, projectId, lang = 'zh') {
  const allTemplates = categoriesWithTemplates.flatMap(category => category.templates);
  
  if (!allTemplates || allTemplates.length === 0) {
    return `<p class="no-templates">${lang === 'zh' ? '暂无可用模板' : 'No templates available'}</p>`;
  }

  return allTemplates.map(template => {
    const templateName = lang === 'zh' ? template.name_zh : template.name_en;
    const templateDesc = lang === 'zh' ? template.description_zh : template.description_en;
    const categoryName = lang === 'zh' ? template.category_name_zh : template.category_name_en;
    const isGenerated = template.status === 'generated';
    
    return `
      <div class="template-card" data-template-id="${template.id}">
        <div class="template-header">
          <span class="template-category">${categoryName}</span>
          <h3 class="template-name">${templateName}</h3>
        </div>
        <p class="template-description">${templateDesc || ''}</p>
        <div class="template-actions">
          <button class="btn-generate" onclick="handleTemplateAction('${projectId}', '${template.id}', 'generate', '${lang}')" ${isGenerated ? 'disabled' : ''}>
            ${lang === 'zh' ? (isGenerated ? '已生成' : '生成模板') : (isGenerated ? 'Generated' : 'Generate')}
          </button>
          <button class="btn-download" onclick="handleTemplateAction('${projectId}', '${template.id}', 'download', '${lang}')" ${!isGenerated ? 'disabled' : ''}>
            ${lang === 'zh' ? '下载模板' : 'Download'}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * 生成HTML页面
 */
function generateHTML(project, categoriesWithTemplates, lang = 'zh') {
  const templateActionScript = `
    <script>
    async function handleTemplateAction(projectId, templateId, action, lang) {
      const button = event.target;
      const originalText = button.innerHTML;
      const loadingText = lang === 'zh' ? '处理中...' : 'Processing...';
      
      try {
        button.disabled = true;
        button.innerHTML = loadingText;
        
        if (action === 'generate') {
          // 生成模板 - 增加超时处理
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时
          
          try {
            const response = await fetch('/.netlify/functions/generate-ai-template', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                projectId: projectId,
                projectName: '${project.name_zh}',
                projectDescription: '${project.description_zh || ''}',
                primaryCategory: '${project.primary_category || ''}',
                secondaryCategory: '${project.secondary_category || ''}',
                templateId: templateId, 
                language: lang 
              }),
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            let result;
            try {
              // 尝试解析JSON响应
              const responseText = await response.text();
              if (!responseText || responseText.includes('TimeoutError') || responseText.includes('Task timed out')) {
                // 如果是超时错误，显示特殊处理
                throw new Error(lang === 'zh' ? '生成时间较长，请稍后查看结果或重试' : 'Generation taking longer than expected, please check later or retry');
              }
              result = JSON.parse(responseText);
            } catch (parseError) {
              if (response.status === 500) {
                throw new Error(lang === 'zh' ? '服务器处理超时，模板可能正在后台生成中' : 'Server timeout, template may still be generating in background');
              }
              throw new Error(lang === 'zh' ? '响应格式错误' : 'Invalid response format');
            }
            
            if (result.success) {
              // 保存生成的内容到数据库
              try {
                const saveResponse = await fetch('/.netlify/functions/save-template-content', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    projectId: projectId,
                    templateId: templateId,
                    content: result.content,
                    language: lang
                  })
                });
              } catch (saveError) {
                console.warn('保存模板内容失败，但生成成功:', saveError);
              }
              
              button.innerHTML = lang === 'zh' ? '已生成' : 'Generated';
              button.disabled = true;
              // 启用下载按钮
              const downloadBtn = button.parentElement.querySelector('.btn-download');
              if (downloadBtn) {
                downloadBtn.disabled = false;
              }
              
              // 显示成功提示
              alert(lang === 'zh' ? '模板生成成功！' : 'Template generated successfully!');
            } else {
              throw new Error(result.error || 'Generation failed');
            }
            
          } catch (fetchError) {
            if (fetchError.name === 'AbortError') {
              throw new Error(lang === 'zh' ? '请求超时，请重试' : 'Request timeout, please retry');
            }
            throw fetchError;
          }
          
        } else if (action === 'download') {
          // 下载模板 - 使用GET请求
          const response = await fetch(\`/.netlify/functions/get-template-content?projectId=\${projectId}&templateId=\${templateId}&lang=\${lang}\`, {
            method: 'GET'
          });
          
          let result;
          try {
            const responseText = await response.text();
            result = JSON.parse(responseText);
          } catch (parseError) {
            throw new Error(lang === 'zh' ? '下载响应格式错误' : 'Download response format error');
          }
          
          if (!response.ok) {
            throw new Error(result.error || response.statusText);
          }
          
          if (result.success && result.content) {
            // 创建下载链接
            const blob = new Blob([result.content], { type: 'text/markdown' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = \`template_\${templateId}.md\`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            // 显示成功提示
            alert(lang === 'zh' ? '模板下载成功！' : 'Template downloaded successfully!');
          } else {
            throw new Error(result.error || 'No content available');
          }
          
          button.innerHTML = originalText;
        }
        
      } catch (error) {
        console.error('Template action failed:', error);
        button.innerHTML = originalText;
        
        // 显示详细错误信息
        let errorMessage;
        if (error.message.includes('timeout') || error.message.includes('超时')) {
          errorMessage = lang === 'zh' 
            ? '生成时间较长，请稍后刷新页面查看结果，或重新尝试生成' 
            : 'Generation is taking longer than expected. Please refresh the page later to check results, or try generating again';
        } else {
          errorMessage = lang === 'zh' 
            ? \`操作失败: \${error.message}\` 
            : \`Operation failed: \${error.message}\`;
        }
        alert(errorMessage);
        
      } finally {
        if (action === 'download' || button.innerHTML === loadingText) {
          button.disabled = false;
          if (button.innerHTML === loadingText) {
            button.innerHTML = originalText;
          }
        }
      }
    }
    </script>
  `;

  return `
    <!DOCTYPE html>
    <html lang="${lang === 'zh' ? 'zh-CN' : 'en'}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${lang === 'zh' ? project.name_zh : project.name_en} - ProductMind AI</title>
      <style>
        /* 基础样式 */
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          background: #f5f5f5;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .project-info {
          background: white;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          margin-bottom: 30px;
        }
        .project-title {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 10px;
          color: #333;
        }
        .project-description {
          color: #666;
          line-height: 1.6;
          margin-bottom: 20px;
        }
        /* 分类卡片样式 */
        .category-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }
        .category-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          text-align: center;
        }
        .category-name {
          font-size: 1.2rem;
          font-weight: 600;
          margin-bottom: 10px;
          color: #333;
        }
        .category-count {
          color: #666;
          font-size: 0.9rem;
        }
        /* 模板卡片样式 */
        .template-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }
        .template-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          transition: transform 0.2s;
        }
        .template-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .template-header {
          margin-bottom: 15px;
        }
        .template-category {
          background: #e3f2fd;
          color: #1976d2;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 500;
        }
        .template-name {
          font-size: 1.1rem;
          font-weight: 600;
          margin: 10px 0 5px 0;
          color: #333;
        }
        .template-description {
          color: #666;
          font-size: 0.9rem;
          line-height: 1.4;
          margin-bottom: 15px;
        }
        .template-actions {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }
        .btn-generate, .btn-download {
          flex: 1;
          padding: 10px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s;
        }
        .btn-generate {
          background: #4CAF50;
          color: white;
        }
        .btn-generate:hover:not(:disabled) {
          background: #45a049;
        }
        .btn-download {
          background: #2196F3;
          color: white;
        }
        .btn-download:hover:not(:disabled) {
          background: #1976d2;
        }
        button:disabled {
          background: #ccc !important;
          cursor: not-allowed;
          opacity: 0.6;
        }
        .no-templates, .no-categories {
          text-align: center;
          color: #666;
          padding: 40px;
          font-style: italic;
        }
        /* 添加提示样式 */
        .timeout-notice {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          color: #856404;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 20px;
          font-size: 0.9rem;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="timeout-notice">
          <strong>${lang === 'zh' ? '提示' : 'Notice'}:</strong> 
          ${lang === 'zh' ? 'AI模板生成需要30-60秒时间，请耐心等待。如果出现超时，模板可能仍在后台生成中，请稍后刷新页面查看。' : 'AI template generation takes 30-60 seconds. Please be patient. If timeout occurs, the template may still be generating in the background, please refresh the page later.'}
        </div>
        
        <div class="project-info">
          <h1 class="project-title">${lang === 'zh' ? project.name_zh : project.name_en}</h1>
          <p class="project-description">${lang === 'zh' ? project.description_zh : project.description_en}</p>
          <div style="display: flex; gap: 30px; margin-top: 20px;">
            <div>
              <strong>${lang === 'zh' ? '模板数量' : 'Templates'}:</strong> 
              ${categoriesWithTemplates.reduce((sum, cat) => sum + cat.templates.length, 0)}
            </div>
            <div>
              <strong>${lang === 'zh' ? '分类数量' : 'Categories'}:</strong> 
              ${categoriesWithTemplates.length}
            </div>
          </div>
        </div>
        
        <h2>${lang === 'zh' ? '模板分类' : 'Template Categories'}</h2>
        <div class="category-grid">
          ${generateTemplateCategoryGrid(categoriesWithTemplates, lang)}
        </div>
        
        <h2>${lang === 'zh' ? '可用模板' : 'Available Templates'}</h2>
        <div class="template-grid">
          ${generateTemplateGrid(categoriesWithTemplates, project.id, lang)}
        </div>
      </div>
      ${templateActionScript}
    </body>
    </html>
  `;
}

/**
 * 生成静态SEO页面
 */
async function generateStaticSEOPage(projectId) {
  try {
    console.log(`🔄 开始处理项目: ${projectId}`);

    // 获取项目信息
    const { data: project, error: projectError } = await supabase
      .from('user_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError) {
      throw new Error(`获取项目信息失败: ${projectError.message}`);
    }

    // 获取模板分类及模板
    const categoriesWithTemplates = await getTemplateCategoriesWithTemplates(projectId);

    // 生成中文页面
    const zhHtml = generateHTML(project, categoriesWithTemplates, 'zh');
    fs.writeFileSync(`${OUTPUT_DIR}/${projectId}.html`, zhHtml);
    console.log(`✅ 生成页面: ${projectId}.html (中文版)`);

    // 生成英文页面
    const enHtml = generateHTML(project, categoriesWithTemplates, 'en');
    fs.writeFileSync(`${OUTPUT_DIR}/${projectId}-en.html`, enHtml);
    console.log(`✅ 生成页面: ${projectId}-en.html (英文版)`);

    // 输出统计信息
    const templateCount = categoriesWithTemplates.reduce((sum, cat) => sum + cat.templates.length, 0);
    console.log(`📊 统计: ${templateCount} 个模板，${categoriesWithTemplates.length} 个分类`);
    console.log(`🎉 成功生成项目页面: static-pages/${projectId}.html`);
    console.log(`📊 项目信息: ${project.name_zh}`);
    console.log(`📋 模板数量: ${templateCount}`);
    console.log(`🏷️ 分类数量: ${categoriesWithTemplates.length}`);
    console.log(`🌐 现在可以访问: http://localhost:8888/static-pages/${projectId}`);

  } catch (error) {
    console.error(`❌ 处理失败: ${error.message}`);
    throw error;
  }
}

// 主函数
async function main() {
  try {
    // 测试项目ID
    const projectId = 'f738a8c4-dacc-49c5-b325-78df5b0d8dc7';
    await generateStaticSEOPage(projectId);
  } catch (error) {
    console.error(`❌ 生成失败: ${error.message}`);
    process.exit(1);
  }
}

main(); 