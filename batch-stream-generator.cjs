const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
dotenv.config();

// Supabase配置
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 错误: 缺少必需的环境变量');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const OUTPUT_DIR = './static-pages';

async function getTemplateCategoriesWithTemplates(projectId) {
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

  if (categoriesError) throw new Error('获取分类和模板失败');

  const { data: versions } = await supabase
    .from('template_versions')
    .select('template_id')
    .eq('project_id', projectId);

  const generatedTemplateIds = new Set((versions || []).map(v => v.template_id));

  return categoriesWithTemplates.map(category => ({
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
}

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

function generateHTML(project, categoriesWithTemplates, lang = 'zh') {
  const isZh = lang === 'zh';
  const title = isZh ? 
    `${project.name_zh || project.name_en} - AI产品模板生成` : 
    `${project.name_en || project.name_zh} - AI Product Template Generator`;
  
  const description = isZh ? 
    (project.description_zh || project.description_en || '智能AI产品分析模板生成工具') :
    (project.description_en || project.description_zh || 'Intelligent AI product analysis template generator');

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    
    <!-- SEO Meta Tags -->
    <meta name="keywords" content="${isZh ? 'AI产品,模板生成,产品分析,智能工具' : 'AI product,template generator,product analysis,intelligent tools'}">
    <meta name="author" content="ProductMind AI">
    <meta name="robots" content="index, follow">
    
    <!-- Open Graph -->
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://productmindai.com/static-pages/${project.id}${lang === 'en' ? '-en' : ''}.html">
    <meta property="og:image" content="https://productmindai.com/og-image.jpg">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="https://productmindai.com/og-image.jpg">
    
    <!-- Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "${title}",
      "description": "${description}",
      "url": "https://productmindai.com/static-pages/${project.id}${lang === 'en' ? '-en' : ''}.html",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      }
    }
    </script>
    
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        
        .header {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        
        .project-title {
            font-size: 2.5rem;
            font-weight: 700;
            color: #2d3748;
            margin-bottom: 15px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .project-description { font-size: 1.1rem; color: #4a5568; margin-bottom: 20px; }
        .project-meta { display: flex; gap: 20px; flex-wrap: wrap; }
        
        .meta-item {
            background: #f7fafc;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9rem;
            color: #2d3748;
        }
        
        .templates-section {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        
        .section-title {
            font-size: 1.8rem;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .template-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .template-card {
            background: white;
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .template-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
        }
        
        .template-header { margin-bottom: 15px; }
        
        .template-category {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 4px 12px;
            border-radius: 15px;
            font-size: 0.8rem;
            font-weight: 500;
        }
        
        .template-name {
            font-size: 1.2rem;
            font-weight: 600;
            color: #2d3748;
            margin-top: 10px;
        }
        
        .template-description {
            color: #4a5568;
            font-size: 0.9rem;
            margin-bottom: 20px;
            line-height: 1.5;
        }
        
        .template-actions { display: flex; gap: 10px; }
        
        .btn-generate, .btn-download {
            flex: 1;
            padding: 10px 16px;
            border: none;
            border-radius: 8px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 0.9rem;
        }
        
        .btn-generate {
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
        }
        
        .btn-generate:hover:not(:disabled) {
            background: linear-gradient(135deg, #45a049, #3d8b40);
            transform: translateY(-2px);
        }
        
        .btn-generate:disabled {
            background: #e2e8f0;
            color: #a0aec0;
            cursor: not-allowed;
        }
        
        .btn-download {
            background: linear-gradient(135deg, #3182ce, #2c5282);
            color: white;
        }
        
        .btn-download:hover:not(:disabled) {
            background: linear-gradient(135deg, #2c5282, #2a4365);
            transform: translateY(-2px);
        }
        
        .btn-download:disabled {
            background: #e2e8f0;
            color: #a0aec0;
            cursor: not-allowed;
        }
        
        .progress-container {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(255, 255, 255, 0.98);
            border-radius: 15px;
            padding: 20px;
            display: flex;
            flex-direction: column;
            z-index: 10;
        }
        
        .progress-header { margin-bottom: 15px; }
        .progress-header h4 { color: #2d3748; margin-bottom: 10px; font-size: 1.1rem; }
        
        .progress-bar {
            width: 100%; height: 6px;
            background: #e2e8f0;
            border-radius: 3px;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #4CAF50, #45a049);
            width: 0%;
            transition: width 0.3s ease;
            border-radius: 3px;
        }
        
        .progress-content-wrapper { flex: 1; overflow: hidden; margin-bottom: 15px; }
        
        .progress-content {
            height: 100%; overflow-y: auto;
            background: #f7fafc;
            border-radius: 8px;
            padding: 15px;
            font-size: 0.9rem;
            line-height: 1.5;
            color: #2d3748;
        }
        
        .progress-notice {
            background: #e6fffa;
            border: 1px solid #81e6d9;
            border-radius: 8px;
            padding: 10px;
            text-align: center;
        }
        
        .progress-notice p { color: #234e52; font-size: 0.9rem; margin: 0; }
        
        .toast {
            position: fixed;
            top: 20px; right: 20px;
            background: white;
            border-radius: 8px;
            padding: 15px 20px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            transform: translateX(100%);
            animation: slideIn 0.3s ease forwards;
            max-width: 400px;
        }
        
        .toast.fade-out { animation: slideOut 0.3s ease forwards; }
        .toast-content { display: flex; align-items: center; gap: 10px; }
        
        .toast-success { border-left: 4px solid #38a169; }
        .toast-error { border-left: 4px solid #e53e3e; }
        .toast-warning { border-left: 4px solid #d69e2e; }
        
        @keyframes slideIn { to { transform: translateX(0); } }
        @keyframes slideOut { to { transform: translateX(100%); } }
        
        @media (max-width: 768px) {
            .container { padding: 15px; }
            .template-grid { grid-template-columns: 1fr; gap: 15px; }
            .project-title { font-size: 2rem; }
            .template-actions { flex-direction: column; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="project-title">${isZh ? (project.name_zh || project.name_en) : (project.name_en || project.name_zh)}</h1>
            <p class="project-description">${isZh ? (project.description_zh || project.description_en || '') : (project.description_en || project.description_zh || '')}</p>
            <div class="project-meta">
                ${project.primary_category ? `<span class="meta-item">${isZh ? '主分类' : 'Primary'}: ${project.primary_category}</span>` : ''}
                ${project.secondary_category ? `<span class="meta-item">${isZh ? '次分类' : 'Secondary'}: ${project.secondary_category}</span>` : ''}
                <span class="meta-item">${isZh ? '创建时间' : 'Created'}: ${new Date(project.created_at).toLocaleDateString(lang)}</span>
            </div>
        </div>
        
        <div class="templates-section">
            <h2 class="section-title">${isZh ? 'AI 模板生成工具' : 'AI Template Generator'}</h2>
            <p style="text-align: center; color: #4a5568; margin-bottom: 30px;">
                ${isZh ? '选择您需要的模板类型，AI将为您的产品生成专业的分析文档' : 'Choose the template type you need, AI will generate professional analysis documents for your product'}
            </p>
            
            <div class="template-grid">
                ${generateTemplateGrid(categoriesWithTemplates, project.id, lang)}
            </div>
        </div>
    </div>
    
    <script>
    class TemplateStreamProcessor {
      constructor() {
        this.isProcessing = false;
      }

      async generateTemplateStream(projectId, templateId, lang, projectInfo) {
        if (this.isProcessing) {
          this.showMessage(lang === 'zh' ? '正在处理中，请稍候...' : 'Processing, please wait...', 'warning');
          return;
        }

        this.isProcessing = true;
        const button = event.target;
        const templateCard = button.closest('.template-card');
        
        try {
          this.showProgressContainer(templateCard, lang);
          
          const response = await fetch('/.netlify/functions/generate-ai-template', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: projectId,
              templateId: templateId,
              language: lang,
              projectName: projectInfo.name,
              projectDescription: projectInfo.description,
              primaryCategory: projectInfo.primaryCategory,
              secondaryCategory: projectInfo.secondaryCategory
            })
          });

          this.simulateProgress(templateCard, lang);

          let result;
          try {
            const responseText = await response.text();
            if (!responseText || responseText.includes('TimeoutError') || responseText.includes('Task timed out')) {
              this.handleTimeout(templateCard, lang);
              return;
            }
            result = JSON.parse(responseText);
          } catch (parseError) {
            if (response.status === 500) {
              this.handleTimeout(templateCard, lang);
              return;
            }
            throw new Error(lang === 'zh' ? '响应格式错误' : 'Invalid response format');
          }

          if (result.success) {
            await this.saveTemplateContent(projectId, templateId, result.content, lang);
            this.completeGeneration(templateCard, result.content, lang);
          } else {
            throw new Error(result.error || (lang === 'zh' ? '生成失败' : 'Generation failed'));
          }

        } catch (error) {
          console.error('生成失败:', error);
          this.showError(templateCard, error.message, lang);
        } finally {
          this.isProcessing = false;
        }
      }

      simulateProgress(templateCard, lang) {
        const progressBar = templateCard.querySelector('.progress-fill');
        const progressContent = templateCard.querySelector('.progress-content');
        
        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 8 + 2;
          if (progress > 95) progress = 95;
          
          if (progressBar) {
            progressBar.style.width = progress + '%';
          }
          
          if (progressContent) {
            const messages = lang === 'zh' ? [
              '正在分析项目信息...',
              '构建AI提示词...',
              '调用AI生成服务...',
              '处理生成内容...',
              '优化模板格式...',
              '准备保存结果...',
              '即将完成...'
            ] : [
              'Analyzing project information...',
              'Building AI prompts...',
              'Calling AI generation service...',
              'Processing generated content...',
              'Optimizing template format...',
              'Preparing to save results...',
              'Almost done...'
            ];
            
            const messageIndex = Math.min(Math.floor(progress / 14), messages.length - 1);
            if (messages[messageIndex]) {
              progressContent.innerHTML = '<p>' + messages[messageIndex] + '</p>';
            }
          }
          
          if (progress >= 95) {
            clearInterval(interval);
          }
        }, 800);
        
        templateCard._progressInterval = interval;
      }

      async saveTemplateContent(projectId, templateId, content, lang) {
        try {
          const saveResponse = await fetch('/.netlify/functions/save-template-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: projectId,
              templateId: templateId,
              content: content,
              language: lang
            })
          });
          
          if (!saveResponse.ok) {
            console.warn('保存模板内容失败，但生成成功');
          }
        } catch (error) {
          console.warn('保存模板内容时出错:', error);
        }
      }

      handleTimeout(templateCard, lang) {
        if (templateCard._progressInterval) {
          clearInterval(templateCard._progressInterval);
        }
        
        const progressContainer = templateCard.querySelector('.progress-container');
        if (progressContainer) {
          progressContainer.innerHTML = \`
            <div style="text-align: center; padding: 20px;">
              <div style="font-size: 3rem; margin-bottom: 15px;">⏰</div>
              <h4 style="color: #d69e2e; margin-bottom: 10px;">\${lang === 'zh' ? '生成时间较长' : 'Generation Taking Longer'}</h4>
              <p style="margin-bottom: 20px;">\${lang === 'zh' ? 
                '由于内容复杂度较高，生成时间超过预期。内容可能已在后台生成完成，请稍后刷新页面查看结果，或重新尝试生成。' : 
                'Due to content complexity, generation is taking longer than expected. Content may have been generated in the background. Please refresh the page later to check results, or try generating again.'
              }</p>
              <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                <button onclick="window.location.reload()" style="background: #38a169; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 0.9rem;">
                  \${lang === 'zh' ? '刷新页面' : 'Refresh Page'}
                </button>
                <button onclick="this.closest('.progress-container').remove()" style="background: #4299e1; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 0.9rem;">
                  \${lang === 'zh' ? '重新尝试' : 'Try Again'}
                </button>
              </div>
            </div>
          \`;
        }
        
        this.showMessage(
          lang === 'zh' ? '生成时间较长，请稍后查看结果' : 'Generation taking longer, please check results later', 
          'warning'
        );
      }

      showProgressContainer(templateCard, lang) {
        const existingProgress = templateCard.querySelector('.progress-container');
        if (existingProgress) {
          existingProgress.remove();
        }

        const progressHTML = \`
          <div class="progress-container">
            <div class="progress-header">
              <h4>\${lang === 'zh' ? '正在生成模板...' : 'Generating template...'}</h4>
              <div class="progress-bar">
                <div class="progress-fill"></div>
              </div>
            </div>
            <div class="progress-content-wrapper">
              <div class="progress-content">
                <p>\${lang === 'zh' ? '初始化生成流程...' : 'Initializing generation process...'}</p>
              </div>
            </div>
            <div class="progress-notice">
              <p>\${lang === 'zh' ? '⏱️ 生成过程需要1-2分钟，请耐心等待...' : '⏱️ Generation takes 1-2 minutes, please be patient...'}</p>
            </div>
          </div>
        \`;
        
        templateCard.insertAdjacentHTML('beforeend', progressHTML);
      }

      completeGeneration(templateCard, content, lang) {
        if (templateCard._progressInterval) {
          clearInterval(templateCard._progressInterval);
        }
        
        const progressContainer = templateCard.querySelector('.progress-container');
        const generateBtn = templateCard.querySelector('.btn-generate');
        const downloadBtn = templateCard.querySelector('.btn-download');
        
        if (generateBtn) {
          generateBtn.disabled = true;
          generateBtn.innerHTML = lang === 'zh' ? '已生成' : 'Generated';
          generateBtn.style.background = 'linear-gradient(135deg, #38a169, #2f855a)';
        }
        
        if (downloadBtn) {
          downloadBtn.disabled = false;
        }
        
        if (progressContainer) {
          progressContainer.innerHTML = \`
            <div style="text-align: center; padding: 20px;">
              <div style="font-size: 3rem; margin-bottom: 15px;">✅</div>
              <h4 style="color: #38a169; margin-bottom: 10px;">\${lang === 'zh' ? '模板生成完成！' : 'Template generated successfully!'}</h4>
              <p style="margin-bottom: 20px;">\${lang === 'zh' ? '内容已保存，您可以点击下载按钮获取模板。' : 'Content saved, you can click download to get the template.'}</p>
              <div style="background: #f7fafc; border-radius: 8px; padding: 15px; margin: 15px 0; text-align: left;">
                <h5 style="color: #2d3748; margin-bottom: 10px; font-size: 0.9rem;">\${lang === 'zh' ? '内容预览：' : 'Content Preview:'}</h5>
                <div style="color: #4a5568; font-size: 0.8rem; line-height: 1.4; max-height: 100px; overflow-y: auto;">\${content.substring(0, 300).replace(/\\n/g, '<br>')}...</div>
              </div>
              <button onclick="this.closest('.progress-container').remove()" style="background: #4299e1; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 0.9rem;">
                \${lang === 'zh' ? '关闭' : 'Close'}
              </button>
            </div>
          \`;
        }
        
        this.showMessage(lang === 'zh' ? '模板生成成功！' : 'Template generated successfully!', 'success');
      }

      showMessage(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = \`toast toast-\${type}\`;
        toast.innerHTML = \`
          <div class="toast-content">
            <span class="toast-icon">\${type === 'success' ? '✅' : type === 'warning' ? '⚠️' : type === 'error' ? '❌' : 'ℹ️'}</span>
            <span class="toast-message">\${message}</span>
          </div>
        \`;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
          toast.classList.add('fade-out');
          setTimeout(() => toast.remove(), 300);
        }, 5000);
      }

      showError(templateCard, error, lang) {
        if (templateCard._progressInterval) {
          clearInterval(templateCard._progressInterval);
        }
        
        const progressContainer = templateCard.querySelector('.progress-container');
        if (progressContainer) {
          progressContainer.innerHTML = \`
            <div style="text-align: center; padding: 20px;">
              <div style="font-size: 3rem; margin-bottom: 15px;">❌</div>
              <h4 style="color: #e53e3e; margin-bottom: 10px;">\${lang === 'zh' ? '生成失败' : 'Generation failed'}</h4>
              <p style="margin-bottom: 20px; color: #e53e3e;">\${error}</p>
              <button onclick="this.closest('.progress-container').remove()" style="background: #4299e1; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 0.9rem;">
                \${lang === 'zh' ? '重试' : 'Retry'}
              </button>
            </div>
          \`;
        }
        
        this.showMessage(lang === 'zh' ? '生成失败: ' + error : 'Generation failed: ' + error, 'error');
      }

      async downloadTemplate(projectId, templateId, lang) {
        try {
          const response = await fetch(\`/.netlify/functions/get-template-content?projectId=\${projectId}&templateId=\${templateId}&lang=\${lang}\`);
          
          if (!response.ok) {
            throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
          }
          
          const result = await response.json();
          
          if (result.success && result.content) {
            const blob = new Blob([result.content], { type: 'text/markdown' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = \`template-\${templateId}.md\`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            this.showMessage(lang === 'zh' ? '下载成功！' : 'Download successful!', 'success');
          } else {
            throw new Error(result.error || (lang === 'zh' ? '获取模板内容失败' : 'Failed to get template content'));
          }
        } catch (error) {
          console.error('下载失败:', error);
          this.showMessage(lang === 'zh' ? '下载失败: ' + error.message : 'Download failed: ' + error.message, 'error');
        }
      }
    }

    const templateProcessor = new TemplateStreamProcessor();

    async function handleTemplateAction(projectId, templateId, action, lang) {
      const projectInfo = {
        name: '${project.name_zh || project.name_en || ''}',
        description: '${project.description_zh || project.description_en || ''}',
        primaryCategory: '${project.primary_category || ''}',
        secondaryCategory: '${project.secondary_category || ''}'
      };

      if (action === 'generate') {
        await templateProcessor.generateTemplateStream(projectId, templateId, lang, projectInfo);
      } else if (action === 'download') {
        await templateProcessor.downloadTemplate(projectId, templateId, lang);
      }
    }
    </script>
</body>
</html>`;
}

async function batchGenerateAllProjects() {
  try {
    console.log('[🚀 BATCH] 开始批量生成所有项目的流式处理静态页面...');
    
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      console.log(`[📁 BATCH] 创建输出目录: ${OUTPUT_DIR}`);
    }
    
    // 获取所有项目
    const { data: projects, error } = await supabase
      .from('user_projects')
      .select('*')
      .not('primary_category', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[❌ BATCH] 获取项目失败:', error);
      throw error;
    }

    console.log(`[✅ BATCH] 找到 ${projects.length} 个项目`);
    
    if (projects.length === 0) {
      console.log('[⚠️ BATCH] 没有找到需要生成页面的项目');
      return;
    }
    
    const results = [];
    const errors = [];
    let processed = 0;
    
    for (const project of projects) {
      try {
        processed++;
        console.log(`[🔄 BATCH] 处理进度: ${processed}/${projects.length} - 项目: ${project.id}`);
        
        const categoriesWithTemplates = await getTemplateCategoriesWithTemplates(project.id);
        
        // 生成中文版本
        const htmlZh = generateHTML(project, categoriesWithTemplates, 'zh');
        const filePathZh = path.join(OUTPUT_DIR, `${project.id}.html`);
        fs.writeFileSync(filePathZh, htmlZh);
        
        // 生成英文版本
        const htmlEn = generateHTML(project, categoriesWithTemplates, 'en');
        const filePathEn = path.join(OUTPUT_DIR, `${project.id}-en.html`);
        fs.writeFileSync(filePathEn, htmlEn);
        
        results.push({
          projectId: project.id,
          projectName: project.name_zh || project.name_en,
          files: { zh: filePathZh, en: filePathEn },
          templateCount: categoriesWithTemplates.reduce((sum, cat) => sum + cat.templates.length, 0)
        });
        
        // 每处理50个项目显示一次进度
        if (processed % 50 === 0) {
          console.log(`[📊 BATCH] 已处理 ${processed}/${projects.length} 个项目 (${Math.round(processed/projects.length*100)}%)`);
        }
        
      } catch (error) {
        console.error(`[❌ BATCH] 项目 ${project.id} 生成失败:`, error.message);
        errors.push({
          projectId: project.id,
          projectName: project.name_zh || project.name_en,
          error: error.message
        });
      }
    }
    
    // 生成批量处理报告
    const report = {
      timestamp: new Date().toISOString(),
      totalProjects: projects.length,
      successfulProjects: results.length,
      failedProjects: errors.length,
      successRate: Math.round((results.length / projects.length) * 100),
      results: results,
      errors: errors
    };
    
    // 保存报告
    const reportPath = path.join(OUTPUT_DIR, 'batch-generation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`[🎉 BATCH] 批量生成完成！`);
    console.log(`[📊 BATCH] 生成统计:`);
    console.log(`  - 总项目数: ${report.totalProjects}`);
    console.log(`  - 成功生成: ${report.successfulProjects}`);
    console.log(`  - 生成失败: ${report.failedProjects}`);
    console.log(`  - 成功率: ${report.successRate}%`);
    console.log(`  - 报告文件: ${reportPath}`);
    
    if (errors.length > 0) {
      console.log(`[⚠️ BATCH] 失败的项目:`);
      errors.slice(0, 10).forEach(error => {
        console.log(`  - ${error.projectId}: ${error.error}`);
      });
      if (errors.length > 10) {
        console.log(`  ... 还有 ${errors.length - 10} 个失败项目，详见报告文件`);
      }
    }
    
    return report;
    
  } catch (error) {
    console.error('[💥 BATCH] 批量生成过程中发生错误:', error);
    throw error;
  }
}

if (require.main === module) {
  batchGenerateAllProjects();
}

module.exports = { batchGenerateAllProjects }; 