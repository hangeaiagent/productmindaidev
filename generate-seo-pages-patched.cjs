const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

/**
 * 生成SEO页面脚本 - PATCH-v2.1.0 版本
 * 修复: 模板名称显示 + 加载状态 + 版本标记
 */

// Supabase配置 - 从环境变量获取
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 错误: 缺少必需的环境变量');
  console.error('请设置以下环境变量:');
  console.error('- VITE_SUPABASE_URL');
  console.error('- VITE_SUPABASE_ANON_KEY');
  console.error('');
  console.error('您可以创建 .env 文件或使用以下命令设置:');
  console.error('export VITE_SUPABASE_URL="your_supabase_url"');
  console.error('export VITE_SUPABASE_ANON_KEY="your_supabase_key"');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 配置
const OUTPUT_DIR = path.join(__dirname, 'static-pages');
const PUBLIC_BASE_URL = 'https://productmindai.com';

/**
 * 获取项目的模板分类及模板
 * 仅包含 isshow=1 的分类和已生成的模板
 */
async function getTemplateCategoriesWithTemplates(projectId) {
  console.log(`[🔍 LOG PATCH-v2.1.0] 开始为项目 ${projectId} 获取模板和分类...`);

  // 1. 获取所有 isshow=1 的分类及其下的所有模板
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
    console.error('[❌ LOG PATCH-v2.1.0] 获取分类和模板失败:', categoriesError);
    throw new Error('获取分类和模板失败');
  }

  const allTemplates = categoriesWithTemplates.flatMap(c => c.templates);
  console.log(`[🔍 LOG PATCH-v2.1.0] 成功获取 ${categoriesWithTemplates.length} 个可见分类，共 ${allTemplates.length} 个模板。`);

  // 2. 获取该项目所有已生成的模板版本
  const { data: versions, error: versionsError } = await supabase
    .from('template_versions')
    .select('template_id')
    .eq('project_id', projectId);

  if (versionsError) {
    console.error('[❌ LOG PATCH-v2.1.0] 获取项目已生成版本失败:', versionsError);
    // 即使获取失败，也继续执行，当作没有任何版本
  }
  const generatedTemplateIds = new Set((versions || []).map(v => v.template_id));
  console.log(`[🔍 LOG PATCH-v2.1.0] 项目 ${projectId} 有 ${generatedTemplateIds.size} 个已生成的模板。`);

  // 3. 组合数据，为每个模板添加生成状态
  const result = categoriesWithTemplates.map(category => {
    return {
      id: category.id,
      name_zh: category.name_zh,
      name_en: category.name_en,
      templates: category.templates.map(template => ({
        ...template,
        category_name_zh: category.name_zh,
        category_name_en: category.name_en,
        status: generatedTemplateIds.has(template.id) ? 'generated' : 'not_generated'
      }))
    };
  }).filter(category => category.templates.length > 0); // 仅保留有模板的分类

  console.log(`[✅ LOG PATCH-v2.1.0] 最终处理完成，得到 ${result.length} 个分类用于显示。`);
  return result;
}

/**
 * 获取项目的基本分类信息
 */
async function getCategoryInfo(categoryCode) {
  if (!categoryCode) return null;
  
  const { data, error } = await supabase
    .from('ai_funding')
    .select('category_name, category_name_en')
    .eq('category_code', categoryCode)
    .limit(1)
    .single();
  
  return data;
}

/**
 * 获取分类图标
 */
function getCategoryIcon(categoryName) {
  // 根据分类名称返回对应的图标
  const iconMap = {
    '产品文档': 'M19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,19H5V5H19V19M17,17H7V7H17V17M15,15H9V9H15V15',
    '技术文档': 'M12,3L1,9L12,15L21,10.09V17H23V9M5,13.18V17.18L12,21L19,17.18V13.18L12,17L5,13.18Z',
    '用户指南': 'M12,3L1,9L12,15L21,10.09V17H23V9M5,13.18V17.18L12,21L19,17.18V13.18L12,17L5,13.18Z',
    'API文档': 'M21,16.5C21,16.88 20.79,17.21 20.47,17.38L12.57,21.82C12.41,21.94 12.21,22 12,22C11.79,22 11.59,21.94 11.43,21.82L3.53,17.38C3.21,17.21 3,16.88 3,16.5V7.5C3,7.12 3.21,6.79 3.53,6.62L11.43,2.18C11.59,2.06 11.79,2 12,2C12.21,2 12.41,2.06 12.57,2.18L20.47,6.62C20.79,6.79 21,7.12 21,7.5V16.5M12,4.15L5,8.09V15.91L12,19.85L19,15.91V8.09L12,4.15Z',
    '开发文档': 'M12,3L1,9L12,15L21,10.09V17H23V9M5,13.18V17.18L12,21L19,17.18V13.18L12,17L5,13.18Z',
    '设计文档': 'M21,16.5C21,16.88 20.79,17.21 20.47,17.38L12.57,21.82C12.41,21.94 12.21,22 12,22C11.79,22 11.59,21.94 11.43,21.82L3.53,17.38C3.21,17.21 3,16.88 3,16.5V7.5C3,7.12 3.21,6.79 3.53,6.62L11.43,2.18C11.59,2.06 11.79,2 12,2C12.21,2 12.41,2.06 12.57,2.18L20.47,6.62C20.79,6.79 21,7.12 21,7.5V16.5M12,4.15L5,8.09V15.91L12,19.85L19,15.91V8.09L12,4.15Z',
    '测试文档': 'M19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,19H5V5H19V19M17,17H7V7H17V17M15,15H9V9H15V15',
    '部署文档': 'M12,3L1,9L12,15L21,10.09V17H23V9M5,13.18V17.18L12,21L19,17.18V13.18L12,17L5,13.18Z',
    '运维文档': 'M21,16.5C21,16.88 20.79,17.21 20.47,17.38L12.57,21.82C12.41,21.94 12.21,22 12,22C11.79,22 11.59,21.94 11.43,21.82L3.53,17.38C3.21,17.21 3,16.88 3,16.5V7.5C3,7.12 3.21,6.79 3.53,6.62L11.43,2.18C11.59,2.06 11.79,2 12,2C12.21,2 12.41,2.06 12.57,2.18L20.47,6.62C20.79,6.79 21,7.12 21,7.5V16.5M12,4.15L5,8.09V15.91L12,19.85L19,15.91V8.09L12,4.15Z',
    '安全文档': 'M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,5A3,3 0 0,1 15,8A3,3 0 0,1 12,11A3,3 0 0,1 9,8A3,3 0 0,1 12,5M17.13,17C15.92,18.85 14.11,20.24 12,20.92C9.89,20.24 8.08,18.85 6.87,17C6.53,16.5 6.24,16 6,15.47C6,13.82 8.71,12.47 12,12.47C15.29,12.47 18,13.79 18,15.47C17.76,16 17.47,16.5 17.13,17Z',
    '默认': 'M19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,19H5V5H19V19Z'
  };

  // 尝试匹配分类名称
  for (const [key, value] of Object.entries(iconMap)) {
    if (categoryName.includes(key)) {
      return value;
    }
  }

  // 如果没有匹配到，返回默认图标
  return iconMap['默认'];
}

/**
 * 生成模板分类网格
 */
function generateTemplateCategoryGrid(categoriesWithTemplates, lang = 'zh') {
  if (!categoriesWithTemplates || categoriesWithTemplates.length === 0) {
    return `<p style="text-align: center; color: rgba(255,255,255,0.8);">${lang === 'zh' ? '暂无可用的模板分类' : 'No template categories available'}</p>`;
  }
  
  return categoriesWithTemplates.map(category => {
    const categoryName = lang === 'zh' ? category.name_zh : category.name_en;
    const iconPath = getCategoryIcon(categoryName);
    
    return `
    <div class="category-card">
        <div class="category-icon">
            <svg viewBox="0 0 24 24">
                <path d="${iconPath}"/>
            </svg>
        </div>
        <h3 class="category-name">${categoryName}</h3>
        <p class="category-count">${category.templates.length} ${lang === 'zh' ? '个模板' : 'templates'}</p>
    </div>
  `}).join('');
}

/**
 * 生成模板网格 - PATCH-v2.1.0 修复版本
 */
function generateTemplateGrid(categoriesWithTemplates, projectId, lang = 'zh') {
  // 提取所有模板
  const allTemplates = categoriesWithTemplates.flatMap(category => category.templates);
  
  if (!allTemplates || allTemplates.length === 0) {
    return `
      <div class="no-templates">
        <svg viewBox="0 0 24 24" class="no-templates-icon">
          <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
        </svg>
        <h3>${lang === 'zh' ? '暂无模板' : 'No Templates'}</h3>
        <p>${lang === 'zh' ? '该项目还没有生成模板内容，或者模板分类未启用显示' : 'No template content has been generated for this project, or template categories are not enabled'}</p>
      </div>
    `;
  }

  return allTemplates.map(template => {
    const templateName = lang === 'zh' ? template.name_zh : template.name_en;
    const templateDesc = lang === 'zh' ? template.description_zh : template.description_en;
    const categoryName = lang === 'zh' ? template.category_name_zh : template.category_name_en;
    
    // PATCH-v2.1.0: 修复 - 传递 event 对象和模板名称（修复引号嵌套问题）
    const escapedTemplateName = templateName.replace(/'/g, "\\'").replace(/"/g, '\\"');
    const actionButton = template.status === 'generated'
      ? `
        <button class="btn-download" onclick="downloadTemplate(event, '${projectId}', '${template.id}', '${escapedTemplateName}')">
            <svg viewBox="0 0 24 24">
                <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/>
            </svg>
            ${lang === 'zh' ? '下载模板' : 'Download Template'}
        </button>
      `
      : `
        <button class="btn-generate" onclick="generateTemplate(event, '${projectId}', '${template.id}', '${escapedTemplateName}')">
            <svg viewBox="0 0 24 24">
                <path d="M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A6,6 0 0,1 18,12H16A4,4 0 0,0 12,8A4,4 0 0,0 8,12H6A6,6 0 0,1 12,6M12,18A6,6 0 0,1 6,12H8A4,4 0 0,0 12,16A4,4 0 0,0 16,12H18A6,6 0 0,1 12,18Z"/>
            </svg>
            ${lang === 'zh' ? '生成模板' : 'Generate Template'}
        </button>
      `;

    return `
    <div class="template-card">
        <div class="template-header">
            <div>
                <h3 class="template-name">${templateName}</h3>
            </div>
            <div class="template-type">${categoryName}</div>
        </div>
        <p class="template-description">${(templateDesc || (lang === 'zh' ? '暂无描述' : 'No description')).substring(0, 120)}...</p>
        <div class="template-actions">
            ${actionButton}
        </div>
    </div>
  `}).join('');
}

/**
 * 获取页面样式
 */
function getAIProductStyles() {
  return `
    :root {
        --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        --accent-color: #f093fb;
        --bg-primary: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
        --bg-white: rgba(255, 255, 255, 0.95);
        --text-primary: #1a202c;
        --text-secondary: #4a5568;
        --text-light: #718096;
        --border-radius: 16px;
        --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1);
        --shadow-lg: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: var(--bg-primary);
        color: var(--text-primary);
        line-height: 1.6;
        min-height: 100vh;
    }

    .ai-container {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
    }

    .ai-nav {
        background: var(--bg-white);
        backdrop-filter: blur(20px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        position: sticky;
        top: 0;
        z-index: 100;
        box-shadow: var(--shadow-sm);
    }

    .nav-content {
        max-width: 1200px;
        margin: 0 auto;
        padding: 1rem 2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .logo {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-weight: 700;
        font-size: 1.25rem;
        color: var(--text-primary);
    }

    .logo-icon { width: 32px; height: 32px; }
    .logo-text { background: var(--primary-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

    .nav-actions {
        display: flex;
        gap: 2rem;
        align-items: center;
    }

    .nav-link {
        color: var(--text-secondary);
        text-decoration: none;
        font-weight: 500;
        transition: var(--transition);
        position: relative;
    }

    .nav-link:hover {
        color: var(--text-primary);
        transform: translateY(-1px);
    }

    .breadcrumb {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .breadcrumb-content {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0.75rem 2rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
    }

    .breadcrumb a {
        color: rgba(255, 255, 255, 0.8);
        text-decoration: none;
        transition: var(--transition);
    }

    .breadcrumb a:hover { color: white; }
    .separator { color: rgba(255, 255, 255, 0.6); margin: 0 0.25rem; }
    .current { color: white; font-weight: 500; }

    .main-content {
        flex: 1;
        max-width: 1200px;
        margin: 0 auto;
        padding: 3rem 2rem;
        width: 100%;
    }

    .btn-generate:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 12px rgba(230, 126, 34, 0.4);
    }
    .btn-generate:disabled, .btn-download:disabled {
        background: #999 !important;
        cursor: not-allowed !important;
        transform: none !important;
        box-shadow: none !important;
    }
    .spinner {
        animation: spin 1s linear infinite;
        width: 16px;
        height: 16px;
        margin-right: 8px;
    }
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    .btn-download {
        display: inline-flex;
        align-items: center;
        padding: 10px 18px;
        background: linear-gradient(45deg, #667eea, #764ba2);
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease-in-out;
    }

    .btn-download:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-download svg, .btn-generate svg { width: 16px; height: 16px; fill: currentColor; margin-right: 8px; }

    .btn-generate {
        display: inline-flex;
        align-items: center;
        padding: 10px 18px;
        background: linear-gradient(45deg, #f0932b, #e67e22);
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease-in-out;
    }
  `;
}

/**
 * 生成页面JavaScript - PATCH-v2.1.2 版本
 */
function getPageJavaScript() {
  return `
    // PATCH-v2.1.2-v1: 全局变量和状态管理
    let currentGenerationTasks = new Map();
    let progressDialogs = new Map();

    // PATCH-v2.1.2-v1: 创建进度对话框
    function createProgressDialog(taskId, templateName) {
        const dialogId = \`progress-\${taskId}\`;
        const dialog = document.createElement('div');
        dialog.id = dialogId;
        dialog.className = 'progress-dialog';
        dialog.innerHTML = \`
            <div class="progress-content">
                <div class="progress-header">
                    <h3>[PATCH-v2.1.2-v1] 生成进度</h3>
                    <button onclick="closeProgressDialog('\${dialogId}')" class="close-btn">×</button>
                </div>
                <div class="progress-info">
                    <div class="template-name">模板: \${templateName}</div>
                    <div class="current-step" id="step-\${taskId}">初始化中...</div>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-label" id="progress-label-\${taskId}">0%</div>
                    <div class="progress-bar">
                        <div class="progress-fill" id="progress-fill-\${taskId}" style="width: 0%"></div>
                    </div>
                </div>
                <div class="progress-footer">
                    <div class="task-id">任务ID: \${taskId}</div>
                </div>
            </div>
        \`;
        
        document.body.appendChild(dialog);
        progressDialogs.set(taskId, dialog);
        return dialog;
    }

    // PATCH-v2.1.2-v1: 更新进度对话框
    function updateProgressDialog(taskId, state) {
        const stepElement = document.getElementById(\`step-\${taskId}\`);
        const labelElement = document.getElementById(\`progress-label-\${taskId}\`);
        const fillElement = document.getElementById(\`progress-fill-\${taskId}\`);
        
        if (stepElement) stepElement.textContent = state.currentStep;
        if (labelElement) labelElement.textContent = \`\${Math.round(state.progress)}%\`;
        if (fillElement) fillElement.style.width = \`\${state.progress}%\`;
    }

    // PATCH-v2.1.2-v1: 关闭进度对话框
    function closeProgressDialog(dialogId) {
        const dialog = document.getElementById(dialogId);
        if (dialog) {
            dialog.remove();
        }
    }

    // PATCH-v2.1.2-v1: 显示完成通知
    function showCompletionNotification(taskId, state) {
        const notification = document.createElement('div');
        notification.className = 'completion-notification';
        notification.innerHTML = \`
            <div class="notification-content">
                <div class="notification-icon">✅</div>
                <div class="notification-text">
                    <h4>[PATCH-v2.1.2-v1] 生成完成!</h4>
                    <p>模板已成功生成</p>
                    <p>字数: \${state.result?.wordCount || 0} 字</p>
                </div>
                <div class="notification-actions">
                    <button onclick="downloadGeneratedFile('\${taskId}')" class="download-btn">立即下载</button>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" class="close-btn">关闭</button>
                </div>
            </div>
        \`;
        
        document.body.appendChild(notification);
        
        // 5秒后自动消失
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    // PATCH-v2.1.2-v1: 下载生成的文件
    function downloadGeneratedFile(taskId) {
        console.log('[PATCH-v2.1.2-v1] 开始下载文件:', taskId);
        window.open(\`/api/download-template/\${taskId}\`, '_blank');
    }

    // PATCH-v2.1.2-v1: 轮询任务状态
    function pollTaskStatus(taskId, templateName) {
        const intervalId = setInterval(async () => {
            try {
                const response = await fetch(\`/api/generation-status/\${taskId}\`);
                const data = await response.json();
                
                if (!data.success) {
                    console.error('[PATCH-v2.1.2-v1] 获取状态失败:', data.message);
                    clearInterval(intervalId);
                    return;
                }

                // 更新进度条
                updateProgressDialog(taskId, data);

                // 检查是否完成
                if (data.completed) {
                    clearInterval(intervalId);
                    
                    // 关闭进度对话框
                    setTimeout(() => {
                        const dialogId = \`progress-\${taskId}\`;
                        closeProgressDialog(dialogId);
                        progressDialogs.delete(taskId);
                    }, 1000);

                    if (data.status === 'completed') {
                        // 显示完成通知
                        showCompletionNotification(taskId, data);
                        console.log('[PATCH-v2.1.2-v1] 生成任务完成:', taskId);
                    } else if (data.status === 'failed') {
                        console.error('[PATCH-v2.1.2-v1] 生成任务失败:', data.error);
                        alert('[PATCH-v2.1.2-v1] 生成失败: ' + data.error);
                    }
                    
                    currentGenerationTasks.delete(taskId);
                }
            } catch (error) {
                console.error('[PATCH-v2.1.2-v1] 轮询状态失败:', error);
                clearInterval(intervalId);
                currentGenerationTasks.delete(taskId);
            }
        }, 1000); // 每秒轮询一次

        return intervalId;
    }

    // PATCH-v2.1.2-v1: 增强版生成模板函数
    async function generateTemplate(projectId, templateId, templateName, button) {
        console.log('[PATCH-v2.1.2-v1] 开始生成模板:', { projectId, templateId, templateName });
        
        if (!button) {
            alert('[PATCH-v2.1.2-v1] 按钮对象未找到，无法显示加载状态');
            return;
        }

        // 保存原始按钮内容
        const originalContent = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<svg class="spinner" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"></circle><path d="M4 12a8 8 0 0 1 8-8V2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path></svg> 启动生成...';

        try {
            // 发起生成请求
            const response = await fetch('/api/generate-template', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, templateId })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || data.message || '生成请求失败');
            }

            console.log('[PATCH-v2.1.2-v1] 生成任务已启动:', data.taskId);

            // 创建进度对话框
            createProgressDialog(data.taskId, templateName);

            // 开始轮询状态
            const intervalId = pollTaskStatus(data.taskId, templateName);
            currentGenerationTasks.set(data.taskId, intervalId);

            // 更新按钮状态
            button.innerHTML = '🔄 生成中...';

        } catch (error) {
            console.error('[PATCH-v2.1.2-v1] 生成模板时出错:', error);
            alert('[PATCH-v2.1.2-v1] 生成失败: ' + error.message);
        } finally {
            // 恢复按钮状态（延迟一点以显示状态变化）
            setTimeout(() => {
                button.disabled = false;
                button.innerHTML = originalContent;
            }, 2000);
        }
    }

    async function downloadTemplate(projectId, templateId, templateName, button) {
        console.log('[PATCH-v2.1.2-v1] 开始下载模板:', { projectId, templateId, templateName });
        if (!button) {
            alert('按钮对象未找到，无法显示加载状态');
            return;
        }
        const originalContent = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<svg class="spinner" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"></circle><path d="M4 12a8 8 0 0 1 8-8V2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path></svg> 正在下载...';
        try {
            const response = await fetch('/api/download-template', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, templateId })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '下载失败');
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = templateName.replace(/[^a-zA-Z0-9\s_\-]/g, '') + '.md';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('[PATCH-v2.1.2-v1] 下载模板时出错:', error);
            alert('下载失败: ' + error.message);
        } finally {
            button.disabled = false;
            button.innerHTML = originalContent;
        }
    }
    function downloadAllTemplates(projectId) {
        console.log('[PATCH-v2.1.2-v1] 批量下载请求:', projectId);
        alert('即将打包下载项目的所有已生成模板');
        window.open('/api/download-all-templates?projectId=' + projectId, '_blank');
    }
    function downloadAllMDC(projectId) {
        console.log('[PATCH-v2.1.2-v1] MDC下载请求:', projectId);
        alert('即将打包下载项目的所有MDC文件');
        window.open('/api/download-mdc?projectId=' + projectId, '_blank');
    }
    document.addEventListener('DOMContentLoaded', function() {
        console.log('[PATCH-v2.1.2-v1] DOM加载完成，初始化交互事件');
        
        // 添加CSS样式 - 修复界面样式错误
        const style = document.createElement('style');
        style.textContent = \`
            /* PATCH-v2.1.2-v1: 进度对话框样式优化 */
            .progress-dialog {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
                padding: 20px;
                width: 380px;
                z-index: 10000;
                border: 1px solid #e2e8f0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            }
            
            .progress-content {
                display: flex;
                flex-direction: column;
                gap: 14px;
            }
            
            .progress-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #f1f5f9;
                padding-bottom: 8px;
            }
            
            .progress-header h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                color: #1e293b;
            }
            
            .close-btn {
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: #64748b;
                width: 28px;
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 6px;
                transition: all 0.2s;
            }
            
            .close-btn:hover {
                background: #f1f5f9;
                color: #334155;
            }
            
            .progress-info {
                font-size: 14px;
                color: #64748b;
            }
            
            .template-name {
                font-weight: 500;
                color: #1e293b;
                margin-bottom: 6px;
                font-size: 15px;
            }
            
            .current-step {
                color: #3b82f6;
                font-style: italic;
                font-size: 13px;
            }
            
            .progress-bar-container {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            
            .progress-label {
                font-size: 12px;
                font-weight: 600;
                color: #374151;
                text-align: right;
            }
            
            .progress-bar {
                width: 100%;
                height: 10px;
                background: #f1f5f9;
                border-radius: 6px;
                overflow: hidden;
                border: 1px solid #e2e8f0;
            }
            
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #3b82f6, #1d4ed8);
                transition: width 0.4s ease;
                border-radius: 5px;
                position: relative;
            }
            
            .progress-fill::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                animation: shimmer 2s infinite;
            }
            
            @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }
            
            .progress-footer {
                font-size: 11px;
                color: #9ca3af;
                text-align: center;
                padding-top: 8px;
                border-top: 1px solid #f1f5f9;
            }
            
            /* PATCH-v2.1.2-v1: 完成通知样式优化 */
            .completion-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
                border-left: 4px solid #10b981;
                width: 340px;
                z-index: 10001;
                animation: slideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            }
            
            @keyframes slideIn {
                from { 
                    transform: translateX(120%) scale(0.8); 
                    opacity: 0; 
                }
                to { 
                    transform: translateX(0) scale(1); 
                    opacity: 1; 
                }
            }
            
            .notification-content {
                padding: 18px;
                display: flex;
                align-items: flex-start;
                gap: 14px;
            }
            
            .notification-icon {
                font-size: 24px;
                line-height: 1;
                animation: bounce 0.6s ease;
            }
            
            @keyframes bounce {
                0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-10px); }
                60% { transform: translateY(-5px); }
            }
            
            .notification-text {
                flex: 1;
            }
            
            .notification-text h4 {
                margin: 0 0 6px 0;
                font-size: 15px;
                font-weight: 600;
                color: #1e293b;
            }
            
            .notification-text p {
                margin: 0 0 4px 0;
                font-size: 13px;
                color: #64748b;
            }
            
            .notification-actions {
                display: flex;
                gap: 8px;
                margin-top: 12px;
            }
            
            .download-btn {
                background: #3b82f6;
                color: white;
                border: none;
                padding: 8px 14px;
                border-radius: 8px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .download-btn:hover {
                background: #2563eb;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
            }
            
            .notification-actions .close-btn {
                background: #f8fafc;
                color: #64748b;
                border: 1px solid #e2e8f0;
                padding: 8px 14px;
                border-radius: 8px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .notification-actions .close-btn:hover {
                background: #f1f5f9;
                color: #475569;
            }
            
            /* PATCH-v2.1.2-v1: 按钮加载动画优化 */
            .spinner {
                display: inline-block;
                width: 16px;
                height: 16px;
                margin-right: 8px;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        \`;
        document.head.appendChild(style);
    });
  `;
}

/**
 * 生成SEO优化的HTML模板 - PATCH-v2.1.0 版本
 */
function generateSEOTemplate(project, categoriesWithTemplates, categoryInfo, lang = 'zh') {
  const projectName = lang === 'zh' ? project.name_zh : project.name_en;
  const projectDesc = lang === 'zh' ? project.description_zh : project.description_en;
  const categoryName = lang === 'zh' ? categoryInfo?.category_name : categoryInfo?.category_name_en;
  const totalTemplates = categoriesWithTemplates.reduce((sum, cat) => sum + cat.templates.length, 0);
  
  return `<!DOCTYPE html>
<html lang="${lang === 'zh' ? 'zh-CN' : 'en'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName} - ${categoryName} | ProductMind AI PATCH-v2.1.0</title>
    <style>
        ${getAIProductStyles()}
    </style>
</head>
<body>
    <div class="ai-container">
        <main class="main-content">
            <header class="project-header">
                <h1>${projectName}</h1>
                <p>${projectDesc}</p>
            </header>

            ${totalTemplates > 0 ? `
            <section class="template-categories">
                <h2>模板分类</h2>
                <div class="category-grid">
                    ${generateTemplateCategoryGrid(categoriesWithTemplates, lang)}
                </div>
            </section>
            ` : ''}

            <section class="template-list">
                <h2>可用模板</h2>
                <div class="template-grid">
                    ${generateTemplateGrid(categoriesWithTemplates, project.id, lang)}
                </div>
            </section>
        </main>
    </div>

    <script>
        ${getPageJavaScript()}
    </script>
</body>
</html>`;
}

/**
 * 生成单个项目的SEO页面 - PATCH-v2.1.0 版本
 */
async function generateProjectPage(projectId, isDemo = false) {
  try {
    console.log(`🔄 [PATCH-v2.1.0] 开始处理项目: ${projectId}`);

    // 获取项目信息
    const { data: project, error: projectError } = await supabase
      .from('user_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new Error(`项目不存在或获取失败: ${projectError?.message}`);
    }

    // 获取模板分类数据（只包含isshow=1的分类）
    const categoriesWithTemplates = await getTemplateCategoriesWithTemplates(projectId);
    
    // 获取分类信息
    const categoryInfo = await getCategoryInfo(project.primary_category_code);

    // 生成中文版本
    const zhHtmlContent = generateSEOTemplate(project, categoriesWithTemplates, categoryInfo, 'zh');
    
    // 生成英文版本
    const enHtmlContent = generateSEOTemplate(project, categoriesWithTemplates, categoryInfo, 'en');

    if (isDemo) {
      return { 
        project, 
        categoriesWithTemplates, 
        categoryInfo, 
        zhHtmlContent,
        enHtmlContent 
      };
    } else {
      // 创建输出目录
      if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      }

      // 写入中文版本
      const zhFileName = `${projectId}.html`;
      const zhFilePath = path.join(OUTPUT_DIR, zhFileName);
      fs.writeFileSync(zhFilePath, zhHtmlContent, 'utf8');

      // 写入英文版本
      const enFileName = `${projectId}-en.html`;
      const enFilePath = path.join(OUTPUT_DIR, enFileName);
      fs.writeFileSync(enFilePath, enHtmlContent, 'utf8');

      const totalTemplates = categoriesWithTemplates.reduce((sum, cat) => sum + cat.templates.length, 0);
      console.log(`✅ [PATCH-v2.1.0] 生成页面: ${zhFileName} (中文版)`);
      console.log(`✅ [PATCH-v2.1.0] 生成页面: ${enFileName} (英文版)`);
      console.log(`📊 [PATCH-v2.1.0] 统计: ${totalTemplates} 个模板，${categoriesWithTemplates.length} 个分类`);
      
      return { 
        project, 
        categoriesWithTemplates, 
        categoryInfo, 
        zhFilePath,
        enFilePath 
      };
    }

  } catch (error) {
    console.error(`❌ [PATCH-v2.1.0] 处理项目 ${projectId} 失败:`, error);
    throw error;
  }
}

module.exports = {
  generateProjectPage,
  generateSEOTemplate
};

// 如果直接运行此脚本，生成指定项目的页面
if (require.main === module) {
  const targetProjectId = process.argv[2] || 'f738a8c4-dacc-49c5-b325-78df5b0d8dc7';
  
  generateProjectPage(targetProjectId, false)
    .then((result) => {
      const totalTemplates = result.categoriesWithTemplates.reduce((sum, cat) => sum + cat.templates.length, 0);
      console.log(`🎉 [PATCH-v2.1.0] 成功生成项目页面: ${result.zhFilePath}`);
      console.log(`📊 [PATCH-v2.1.0] 项目信息: ${result.project.name || '未命名'}`);
      console.log(`📋 [PATCH-v2.1.0] 模板数量: ${totalTemplates}`);
      console.log(`🏷️ [PATCH-v2.1.0] 分类数量: ${result.categoriesWithTemplates.length}`);
      console.log(`🌐 [PATCH-v2.1.0] 现在可以访问: http://localhost:3030/preview/${targetProjectId}`);
    })
    .catch((error) => {
      console.error('❌ [PATCH-v2.1.0] 生成失败:', error);
    });
} 