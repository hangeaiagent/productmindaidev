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
        
        const response = await fetch('/.netlify/functions/' + (action === 'generate' ? 'generate-ai-template' : 'get-template-content'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, templateId, language: lang })
        });
        
        if (!response.ok) {
          throw new Error(response.statusText);
        }
        
        const result = await response.json();
        
        if (action === 'generate') {
          button.innerHTML = lang === 'zh' ? '已生成' : 'Generated';
          button.disabled = true;
          const downloadBtn = button.parentElement.querySelector('.btn-download');
          downloadBtn.disabled = false;
        } else if (action === 'download' && result.content) {
          const blob = new Blob([result.content], { type: 'text/markdown' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = \`template_\${templateId}.md\`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          button.innerHTML = originalText;
        }
      } catch (error) {
        console.error('Template action failed:', error);
        button.innerHTML = originalText;
        alert(lang === 'zh' ? '操作失败，请重试' : 'Operation failed, please try again');
      } finally {
        if (action === 'download') {
          button.disabled = false;
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
        }
        /* 模板卡片样式 */
        .template-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }
        .template-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .template-actions {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }
        .btn-generate, .btn-download {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .btn-generate {
          background: #4CAF50;
          color: white;
        }
        .btn-download {
          background: #2196F3;
          color: white;
        }
        button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${lang === 'zh' ? project.name_zh : project.name_en}</h1>
        <div class="category-grid">
          ${generateTemplateCategoryGrid(categoriesWithTemplates, lang)}
        </div>
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