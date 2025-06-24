const express = require('express');
const cors = require('cors');
const path = require('path');
const JSZip = require('jszip');
require('dotenv').config({ path: 'aws-backend/.env' });

const app = express();
const PORT = 8888;

app.use(cors());
app.use(express.json());

// 初始化Supabase客户端
const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ 缺少必要的环境变量');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 导入functions-js脚本
const getCategories = require('./netlify/functions-js/get-categories.cjs');
const getProjectsByCategory = require('./netlify/functions-js/get-projects-by-category.cjs');
const checkCategoryCodes = require('./netlify/functions-js/check-category-codes.cjs');

// 设置路由
app.get('/.netlify/functions/get-categories', async (req, res) => {
    try {
        console.log('📊 调用 get-categories 函数');
        const result = await getCategories.handler({
            httpMethod: 'GET',
            queryStringParameters: req.query,
            headers: req.headers
        });
        
        res.status(result.statusCode || 200);
        if (result.headers) {
            Object.keys(result.headers).forEach(key => {
                res.set(key, result.headers[key]);
            });
        }
        res.send(result.body);
    } catch (error) {
        console.error('❌ get-categories 错误:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/.netlify/functions/get-projects-by-category', async (req, res) => {
    try {
        console.log('📊 调用 get-projects-by-category 函数');
        const result = await getProjectsByCategory.handler({
            httpMethod: 'GET',
            queryStringParameters: req.query,
            headers: req.headers
        });
        
        res.status(result.statusCode || 200);
        if (result.headers) {
            Object.keys(result.headers).forEach(key => {
                res.set(key, result.headers[key]);
            });
        }
        res.send(result.body);
    } catch (error) {
        console.error('❌ get-projects-by-category 错误:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/.netlify/functions/check-category-codes', async (req, res) => {
    try {
        console.log('📊 调用 check-category-codes 函数');
        const result = await checkCategoryCodes.handler({
            httpMethod: 'GET',
            queryStringParameters: req.query,
            headers: req.headers
        });
        
        res.status(result.statusCode || 200);
        if (result.headers) {
            Object.keys(result.headers).forEach(key => {
                res.set(key, result.headers[key]);
            });
        }
        res.send(result.body);
    } catch (error) {
        console.error('❌ check-category-codes 错误:', error);
        res.status(500).json({ error: error.message });
    }
});

// 项目模板下载API
app.get('/api/projects/:projectId/templates/download-all', async (req, res) => {
    try {
        const { projectId } = req.params;
        const language = req.query.language || 'zh';
        
        console.log(`📦 开始下载项目 ${projectId} 的所有模板，语言: ${language}`);
        
        // 获取项目信息
        const { data: project, error: projectError } = await supabase
            .from('user_projects')
            .select('id, name, description')
            .eq('id', projectId)
            .single();
        
        if (projectError || !project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }
        
        // 获取项目的所有模板版本
        const { data: versions, error } = await supabase
            .from('template_versions')
            .select(`
                id,
                template_id,
                output_content_zh,
                output_content_en,
                created_at,
                templates:template_id (
                    id,
                    name_zh,
                    name_en
                )
            `)
            .eq('project_id', projectId)
            .eq('is_active', true);
        
        if (error) {
            console.error('获取模板版本失败:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch template versions'
            });
        }
        
        if (!versions || versions.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No templates found for this project'
            });
        }
        
        // 创建ZIP文件
        const zip = new JSZip();
        
        // 添加项目信息文件
        const readmeContent = `# ${project.name || '未命名项目'}

${project.description || ''}

## 生成信息
- 生成时间：${new Date().toLocaleString('zh-CN')}
- 模板数量：${versions.length}
- 语言：${language === 'zh' ? '中文' : 'English'}

---
*由ProductMind AI自动生成*`;
        
        zip.file('README.md', readmeContent);
        
        // 添加每个模板文件
        for (const version of versions) {
            try {
                const template = version.templates;
                const templateName = language === 'zh' 
                    ? (template?.name_zh || template?.name_en || 'Unknown Template')
                    : (template?.name_en || template?.name_zh || 'Unknown Template');
                
                // 获取内容
                let content = '';
                if (language === 'zh' && version.output_content_zh) {
                    const parsed = typeof version.output_content_zh === 'string' 
                        ? JSON.parse(version.output_content_zh) 
                        : version.output_content_zh;
                    content = parsed.content || '';
                } else if (language === 'en' && version.output_content_en) {
                    const parsed = typeof version.output_content_en === 'string'
                        ? JSON.parse(version.output_content_en)
                        : version.output_content_en;
                    content = parsed.content || '';
                }
                
                if (!content) {
                    content = `# ${templateName}

## 项目信息
- 项目名称: ${project.name}
- 项目描述: ${project.description || '暂无描述'}

## 模板内容
暂无内容，请重新生成模板。

---
*生成时间: ${new Date().toLocaleString('zh-CN')}*`;
                }
                
                // 生成安全的文件名
                const safeFileName = templateName
                    .replace(/[<>:"/\\|?*]/g, '')
                    .replace(/\s+/g, '_')
                    .substring(0, 50);
                
                zip.file(`${safeFileName}.md`, content);
                
            } catch (error) {
                console.error(`处理模板 ${version.id} 失败:`, error);
            }
        }
        
        // 生成并返回ZIP文件
        const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
        
        const safeProjectName = (project.name || 'project')
            .replace(/[<>:"/\\|?*\u4e00-\u9fff]/g, '')  // 移除特殊字符和中文字符
            .replace(/\s+/g, '_')
            .substring(0, 30) || 'project';
        
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${safeProjectName}_Templates_${new Date().toISOString().slice(0, 10)}.zip"`);
        res.send(zipContent);
        
        console.log(`✅ 项目 ${projectId} 模板下载完成，共 ${versions.length} 个文件`);
        
    } catch (error) {
        console.error('模板下载失败:', error);
        res.status(500).json({
            success: false,
            error: 'Template download failed',
            details: error.message
        });
    }
});

// MDC文件下载API
app.get('/api/projects/:projectId/mdc/download-all', async (req, res) => {
    try {
        const { projectId } = req.params;
        
        console.log(`📦 开始下载项目 ${projectId} 的MDC文件`);
        
        // 获取项目信息
        const { data: project, error: projectError } = await supabase
            .from('user_projects')
            .select('id, name, description')
            .eq('id', projectId)
            .single();
        
        if (projectError || !project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }
        
        // 获取项目的MDC内容
        const { data: versions, error } = await supabase
            .from('template_versions')
            .select(`
                id,
                template_id,
                mdcpromptcontent_en,
                mdcpromptcontent_zh,
                templates:template_id (
                    id,
                    name_zh,
                    name_en
                )
            `)
            .eq('project_id', projectId)
            .eq('is_active', true)
            .not('mdcpromptcontent_en', 'is', null);
        
        if (error) {
            console.error('获取MDC内容失败:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch MDC content'
            });
        }
        
        if (!versions || versions.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No MDC content found for this project'
            });
        }
        
        // 创建ZIP文件
        const zip = new JSZip();
        
        // 添加项目信息文件
        const readmeContent = `# ${project.name || '未命名项目'} - Cursor Rules

${project.description || ''}

## 生成信息
- 生成时间：${new Date().toLocaleString('zh-CN')}
- MDC文件数量：${versions.length}

## 使用说明
1. 将.mdc文件放入项目根目录
2. 在Cursor中打开项目
3. 文件将自动生效，为您的编程提供智能提示

---
*由ProductMind AI智能生成*`;
        
        zip.file('README.md', readmeContent);
        
        // 添加每个MDC文件
        for (const version of versions) {
            try {
                const template = version.templates;
                const templateName = template?.name_en || template?.name_zh || 'Unknown Template';
                
                // 获取MDC内容（优先使用英文）
                const mdcContent = version.mdcpromptcontent_en || version.mdcpromptcontent_zh || '';
                
                if (!mdcContent) continue;
                
                // 生成安全的文件名
                const safeFileName = templateName
                    .replace(/[<>:"/\\|?*]/g, '')
                    .replace(/\s+/g, '_')
                    .substring(0, 50);
                
                zip.file(`${safeFileName}.mdc`, mdcContent);
                
            } catch (error) {
                console.error(`处理MDC文件 ${version.id} 失败:`, error);
            }
        }
        
        // 生成并返回ZIP文件
        const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
        
        const safeProjectName = (project.name || 'project')
            .replace(/[<>:"/\\|?*\u4e00-\u9fff]/g, '')  // 移除特殊字符和中文字符
            .replace(/\s+/g, '_')
            .substring(0, 30) || 'project';
        
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${safeProjectName}_Cursor_Rules_${new Date().toISOString().slice(0, 10)}.zip"`);
        res.send(zipContent);
        
        console.log(`✅ 项目 ${projectId} MDC文件下载完成，共 ${versions.length} 个文件`);
        
    } catch (error) {
        console.error('MDC文件下载失败:', error);
        res.status(500).json({
            success: false,
            error: 'MDC download failed',
            details: error.message
        });
    }
});

// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 Functions服务器运行在端口 ${PORT}`);
    console.log(`📊 可用端点:`);
    console.log(`   - GET /.netlify/functions/get-categories`);
    console.log(`   - GET /.netlify/functions/get-projects-by-category`);
    console.log(`   - GET /.netlify/functions/check-category-codes`);
    console.log(`   - GET /api/projects/:projectId/templates/download-all`);
    console.log(`   - GET /api/projects/:projectId/mdc/download-all`);
    console.log(`   - GET /health`);
}); 