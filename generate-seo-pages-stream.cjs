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
 * 生成流式处理脚本 - 参考dashboard实现
 */
function generateStreamingScript(project, lang = 'zh') {
  return `
    <script>
    // 流式处理类 - 参考dashboard的实现
    class TemplateStreamProcessor {
      constructor() {
        this.isProcessing = false;
        this.currentStream = null;
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
          // 显示进度容器
          this.showProgressContainer(templateCard, lang);
          
          // 使用现有的非流式API，但添加更好的用户体验
          const response = await fetch('/.netlify/functions/generate-ai-template', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json'
            },
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

          // 模拟进度更新
          this.simulateProgress(templateCard, lang);

          let result;
          try {
            const responseText = await response.text();
            if (!responseText || responseText.includes('TimeoutError') || responseText.includes('Task timed out')) {
              // 如果是超时，显示特殊处理
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
            // 保存生成的内容到数据库
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
          progress += Math.random() * 10;
          if (progress > 90) progress = 90;
          
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
              '准备保存结果...'
            ] : [
              'Analyzing project information...',
              'Building AI prompts...',
              'Calling AI generation service...',
              'Processing generated content...',
              'Optimizing template format...',
              'Preparing to save results...'
            ];
            
            const messageIndex = Math.floor(progress / 15);
            if (messages[messageIndex]) {
              progressContent.innerHTML = '<p>' + messages[messageIndex] + '</p>';
            }
          }
          
          if (progress >= 90) {
            clearInterval(interval);
          }
        }, 1000);
        
        // 存储interval以便清理
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
        // 清理进度模拟
        if (templateCard._progressInterval) {
          clearInterval(templateCard._progressInterval);
        }
        
        const progressContainer = templateCard.querySelector('.progress-container');
        if (progressContainer) {
          progressContainer.innerHTML = \`
            <div class="timeout-message">
              <div class="timeout-icon">⏰</div>
              <h4>\${lang === 'zh' ? '生成时间较长' : 'Generation Taking Longer'}</h4>
              <p>\${lang === 'zh' ? 
                '由于内容复杂度较高，生成时间超过预期。内容可能已在后台生成完成，请稍后刷新页面查看结果，或重新尝试生成。' : 
                'Due to content complexity, generation is taking longer than expected. Content may have been generated in the background. Please refresh the page later to check results, or try generating again.'
              }</p>
              <div class="timeout-actions">
                <button class="btn-refresh" onclick="window.location.reload()">
                  \${lang === 'zh' ? '刷新页面' : 'Refresh Page'}
                </button>
                <button class="btn-retry" onclick="this.closest('.progress-container').remove()">
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
        // 清理进度模拟
        if (templateCard._progressInterval) {
          clearInterval(templateCard._progressInterval);
        }
        
        const progressContainer = templateCard.querySelector('.progress-container');
        const generateBtn = templateCard.querySelector('.btn-generate');
        const downloadBtn = templateCard.querySelector('.btn-download');
        
        // 更新按钮状态
        if (generateBtn) {
          generateBtn.disabled = true;
          generateBtn.innerHTML = lang === 'zh' ? '已生成' : 'Generated';
          generateBtn.classList.add('completed');
        }
        
        if (downloadBtn) {
          downloadBtn.disabled = false;
          downloadBtn.classList.remove('disabled');
        }
        
        // 显示完成消息
        if (progressContainer) {
          progressContainer.innerHTML = \`
            <div class="completion-message">
              <div class="success-icon">✅</div>
              <h4>\${lang === 'zh' ? '模板生成完成！' : 'Template generated successfully!'}</h4>
              <p>\${lang === 'zh' ? '内容已保存，您可以点击下载按钮获取模板。' : 'Content saved, you can click download to get the template.'}</p>
              <div class="content-preview">
                <h5>\${lang === 'zh' ? '内容预览：' : 'Content Preview:'}</h5>
                <div class="preview-text">\${this.formatContent(content.substring(0, 200))}...</div>
              </div>
              <button class="btn-close" onclick="this.closest('.progress-container').remove()">
                \${lang === 'zh' ? '关闭' : 'Close'}
              </button>
            </div>
          \`;
        }
        
        this.showMessage(lang === 'zh' ? '模板生成成功！' : 'Template generated successfully!', 'success');
      }

      formatContent(content) {
        // 简单的markdown到HTML转换
        return content
          .replace(/\\n/g, '<br>')
          .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')
          .replace(/\\*(.*?)\\*/g, '<em>$1</em>')
          .replace(/\`(.*?)\`/g, '<code>$1</code>');
      }

      showMessage(message, type = 'info') {
        // 创建toast消息
        const toast = document.createElement('div');
        toast.className = \`toast toast-\${type}\`;
        toast.innerHTML = \`
          <div class="toast-content">
            <span class="toast-icon">\${type === 'success' ? '✅' : type === 'warning' ? '⚠️' : type === 'error' ? '❌' : 'ℹ️'}</span>
            <span class="toast-message">\${message}</span>
          </div>
        \`;
        
        document.body.appendChild(toast);
        
        // 自动移除
        setTimeout(() => {
          toast.classList.add('fade-out');
          setTimeout(() => toast.remove(), 4000);
        }, 4000);
      }

      showError(templateCard, error, lang) {
        // 清理进度模拟
        if (templateCard._progressInterval) {
          clearInterval(templateCard._progressInterval);
        }
        
        const progressContainer = templateCard.querySelector('.progress-container');
        if (progressContainer) {
          progressContainer.innerHTML = \`
            <div class="error-message">
              <div class="error-icon">❌</div>
              <h4>\${lang === 'zh' ? '生成失败' : 'Generation failed'}</h4>
              <p>\${error}</p>
              <button class="btn-retry" onclick="this.closest('.progress-container').remove()">
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
            // 创建下载
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

    // 全局实例
    const templateProcessor = new TemplateStreamProcessor();

    // 全局处理函数
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
  `;
}

/**
 * 生成HTML页面
 */
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
    <meta property="og:url" content="${PUBLIC_BASE_URL}/static-pages/${project.id}${lang === 'en' ? '-en' : ''}.html">
    <meta property="og:image" content="${PUBLIC_BASE_URL}/og-image.jpg">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${PUBLIC_BASE_URL}/og-image.jpg">
    
    <style>
        /* 基础样式 */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        /* 头部样式 */
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
            background-clip: text;
        }
        
        .project-description {
            font-size: 1.1rem;
            color: #4a5568;
            margin-bottom: 20px;
        }
        
        .project-meta {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
        }
        
        .meta-item {
            background: #f7fafc;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9rem;
            color: #2d3748;
        }
        
        /* 模板网格样式 */
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
        
        .template-header {
            margin-bottom: 15px;
        }
        
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
        
        .template-actions {
            display: flex;
            gap: 10px;
        }
        
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
        
        .btn-generate.completed {
            background: linear-gradient(135deg, #38a169, #2f855a);
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
        
        /* 进度容器样式 */
        .progress-container {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.98);
            border-radius: 15px;
            padding: 20px;
            display: flex;
            flex-direction: column;
            z-index: 10;
        }
        
        .progress-header {
            margin-bottom: 15px;
        }
        
        .progress-header h4 {
            color: #2d3748;
            margin-bottom: 10px;
            font-size: 1.1rem;
        }
        
        .progress-bar {
            width: 100%;
            height: 6px;
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
        
        .progress-content-wrapper {
            flex: 1;
            overflow: hidden;
            margin-bottom: 15px;
        }
        
        .progress-content {
            height: 100%;
            overflow-y: auto;
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
        
        .progress-notice p {
            color: #234e52;
            font-size: 0.9rem;
            margin: 0;
        }
        
        /* 完成、错误和超时消息样式 */
        .completion-message, .error-message, .timeout-message {
            text-align: center;
            padding: 20px;
        }
        
        .success-icon, .error-icon, .timeout-icon {
            font-size: 3rem;
            margin-bottom: 15px;
        }
        
        .completion-message h4 {
            color: #38a169;
            margin-bottom: 10px;
        }
        
        .error-message h4 {
            color: #e53e3e;
            margin-bottom: 10px;
        }
        
        .timeout-message h4 {
            color: #d69e2e;
            margin-bottom: 10px;
        }
        
        .content-preview {
            background: #f7fafc;
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
            text-align: left;
        }
        
        .content-preview h5 {
            color: #2d3748;
            margin-bottom: 10px;
            font-size: 0.9rem;
        }
        
        .preview-text {
            color: #4a5568;
            font-size: 0.8rem;
            line-height: 1.4;
        }
        
        .timeout-actions {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 15px;
        }
        
        .btn-close, .btn-retry, .btn-refresh {
            background: #4299e1;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9rem;
        }
        
        .btn-close:hover, .btn-retry:hover, .btn-refresh:hover {
            background: #3182ce;
        }
        
        .btn-refresh {
            background: #38a169;
        }
        
        .btn-refresh:hover {
            background: #2f855a;
        }
        
        /* Toast样式 */
        .toast {
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border-radius: 8px;
            padding: 15px 20px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            transform: translateX(100%);
            animation: slideIn 0.3s ease forwards;
            max-width: 400px;
        }
        
        .toast.fade-out {
            animation: slideOut 0.3s ease forwards;
        }
        
        .toast-content {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .toast-success {
            border-left: 4px solid #38a169;
        }
        
        .toast-error {
            border-left: 4px solid #e53e3e;
        }
        
        .toast-warning {
            border-left: 4px solid #d69e2e;
        }
        
        .toast-info {
            border-left: 4px solid #3182ce;
        }
        
        @keyframes slideIn {
            to { transform: translateX(0); }
        }
        
        @keyframes slideOut {
            to { transform: translateX(100%); }
        }
        
        /* 响应式设计 */
        @media (max-width: 768px) {
            .container {
                padding: 15px;
            }
            
            .template-grid {
                grid-template-columns: 1fr;
                gap: 15px;
            }
            
            .project-title {
                font-size: 2rem;
            }
            
            .template-actions {
                flex-direction: column;
            }
            
            .timeout-actions {
                flex-direction: column;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- 项目头部信息 -->
        <div class="header">
            <h1 class="project-title">${isZh ? (project.name_zh || project.name_en) : (project.name_en || project.name_zh)}</h1>
            <p class="project-description">${isZh ? (project.description_zh || project.description_en || '') : (project.description_en || project.description_zh || '')}</p>
            <div class="project-meta">
                ${project.primary_category ? `<span class="meta-item">${isZh ? '主分类' : 'Primary'}: ${project.primary_category}</span>` : ''}
                ${project.secondary_category ? `<span class="meta-item">${isZh ? '次分类' : 'Secondary'}: ${project.secondary_category}</span>` : ''}
                <span class="meta-item">${isZh ? '创建时间' : 'Created'}: ${new Date(project.created_at).toLocaleDateString(lang)}</span>
            </div>
        </div>
        
        <!-- 模板生成区域 -->
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
    
    ${generateStreamingScript(project, lang)}
</body>
</html>`;
}

/**
 * 生成单个项目的页面
 */
async function generateProjectPage(project) {
  try {
    console.log(`[🚀 LOG] 开始生成项目页面: ${project.id}`);
    
    // 获取模板分类和模板
    const categoriesWithTemplates = await getTemplateCategoriesWithTemplates(project.id);
    
    // 生成中文版本
    const htmlZh = generateHTML(project, categoriesWithTemplates, 'zh');
    const filePathZh = path.join(OUTPUT_DIR, `${project.id}.html`);
    fs.writeFileSync(filePathZh, htmlZh);
    console.log(`[✅ LOG] 中文页面已生成: ${filePathZh}`);
    
    // 生成英文版本
    const htmlEn = generateHTML(project, categoriesWithTemplates, 'en');
    const filePathEn = path.join(OUTPUT_DIR, `${project.id}-en.html`);
    fs.writeFileSync(filePathEn, htmlEn);
    console.log(`[✅ LOG] 英文页面已生成: ${filePathEn}`);
    
    return {
      zh: filePathZh,
      en: filePathEn
    };
  } catch (error) {
    console.error(`[❌ LOG] 生成项目页面失败 ${project.id}:`, error);
    throw error;
  }
}

/**
 * 获取所有需要生成页面的项目
 */
async function getAllProjects() {
  console.log('[🔍 LOG] 获取所有项目...');
  
  const { data: projects, error } = await supabase
    .from('user_projects')
    .select('*')
    .not('primary_category', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[❌ LOG] 获取项目失败:', error);
    throw error;
  }

  console.log(`[✅ LOG] 找到 ${projects.length} 个项目`);
  return projects;
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('[🚀 LOG] 开始生成SEO优化的AI产品页面（流式版本）...');
    
    // 确保输出目录存在
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      console.log(`[📁 LOG] 创建输出目录: ${OUTPUT_DIR}`);
    }
    
    // 获取所有项目
    const projects = await getAllProjects();
    
    if (projects.length === 0) {
      console.log('[⚠️ LOG] 没有找到需要生成页面的项目');
      return;
    }
    
    // 生成每个项目的页面
    const results = [];
    for (const project of projects) {
      try {
        const result = await generateProjectPage(project);
        results.push({
          projectId: project.id,
          projectName: project.name_zh || project.name_en,
          files: result
        });
      } catch (error) {
        console.error(`[❌ LOG] 项目 ${project.id} 页面生成失败:`, error);
      }
    }
    
    console.log(`[🎉 LOG] 页面生成完成！成功生成 ${results.length} 个项目的页面`);
    console.log('[📊 LOG] 生成结果:', results);
    
  } catch (error) {
    console.error('[💥 LOG] 生成过程中发生错误:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  generateProjectPage,
  getAllProjects,
  main
}; 