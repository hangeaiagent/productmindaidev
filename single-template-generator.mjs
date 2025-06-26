import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: 'aws-backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 获取命令行参数
const templateVersionId = process.argv[2];

if (!templateVersionId) {
    console.log('❌ 请提供模板版本ID');
    console.log('用法: node single-template-generator.mjs <template_version_id>');
    process.exit(1);
}

console.log(`🔍 开始生成模板版本: ${templateVersionId}`);

async function generateSingleTemplate() {
    try {
        // 查询模板版本数据
        const { data: record, error } = await supabase
            .from('template_versions')
            .select(`
                id, project_id, template_id, created_at,
                output_content_zh, output_content_en,
                templates:template_id (name_zh, name_en),
                user_projects:project_id (
                    name, name_zh, name_en, description_zh, description_en,
                    primary_category_code, secondary_category_code
                )
            `)
            .eq('id', templateVersionId)
            .single();

        if (error) {
            console.error('❌ 数据库查询错误:', error.message);
            return;
        }

        if (!record) {
            console.log('❌ 未找到该模板版本记录');
            return;
        }

        console.log('✅ 找到模板版本记录');
        console.log('   项目:', record.user_projects?.name_zh || record.user_projects?.name);
        console.log('   模板:', record.templates?.name_zh);

        // 检查分类信息
        const project = record.user_projects;
        if (!project.primary_category_code || !project.secondary_category_code) {
            console.log('❌ 项目缺少分类信息，跳过生成');
            return;
        }

        // 查询分类信息
        const { data: categories } = await supabase
            .from('categories')
            .select('code, name_zh, name_en');

        const primaryCategory = categories?.find(cat => cat.code === project.primary_category_code);
        const secondaryCategory = categories?.find(cat => cat.code === project.secondary_category_code);

        const categoryZh = primaryCategory?.name_zh || '未知分类';
        const categoryEn = primaryCategory?.name_en || 'Unknown Category';
        const subcategoryZh = secondaryCategory?.name_zh || '未知子分类';
        const subcategoryEn = secondaryCategory?.name_en || 'Unknown Subcategory';

        console.log(`✅ 分类信息: ${categoryZh} / ${subcategoryZh}`);

        // 创建项目目录
        const outputDir = path.join('/home/productmindaidev/static-pages/pdhtml', record.project_id);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log(`✅ 创建项目目录: ${outputDir}`);
        }

        // 生成HTML文件
        const filePathZh = path.join(outputDir, `${record.id}.html`);
        const filePathEn = path.join(outputDir, `${record.id}en.html`);

        // 生成中文页面
        const htmlZh = generateHTML(record, 'zh', categoryZh, subcategoryZh);
        fs.writeFileSync(filePathZh, htmlZh, 'utf-8');
        console.log(`✅ 中文页面: ${filePathZh}`);

        // 生成英文页面
        const htmlEn = generateHTML(record, 'en', categoryEn, subcategoryEn);
        fs.writeFileSync(filePathEn, htmlEn, 'utf-8');
        console.log(`✅ 英文页面: ${filePathEn}`);

        // 更新数据库中的路径信息
        const { error: updateError } = await supabase
            .from('template_versions')
            .update({
                cnhtmlpath: `static-pages/pdhtml/${record.project_id}/${record.id}.html`,
                enhtmlpath: `static-pages/pdhtml/${record.project_id}/${record.id}en.html`
            })
            .eq('id', record.id);

        if (updateError) {
            console.error('❌ 更新数据库路径失败:', updateError.message);
        } else {
            console.log('✅ 数据库路径已更新');
        }

        console.log('🎉 模板页面生成完成！');

    } catch (error) {
        console.error('❌ 生成过程出错:', error.message);
    }
}

function generateHTML(record, lang, category, subcategory) {
    const isZh = lang === 'zh';
    const project = record.user_projects;
    const template = record.templates;
    
    const title = isZh ? 
        `${project.name_zh || project.name} - ${template.name_zh} | AI产品中心` :
        `${project.name_en || project.name} - ${template.name_en} | AI Products Hub`;
    
    const content = isZh ? record.output_content_zh : record.output_content_en;
    
    const breadcrumbHtml = `
        <nav class="breadcrumb-nav">
            <div class="container">
                <ol class="breadcrumb">
                    <li><a href="${isZh ? '/' : '/en/'}">${isZh ? 'AI产品中心' : 'AI Products Hub'}</a></li>
                    <li><span>${category}</span></li>
                    <li><span>${subcategory}</span></li>
                </ol>
            </div>
        </nav>
    `;

    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${isZh ? project.description_zh || project.name_zh : project.description_en || project.name_en}">
    <link rel="stylesheet" href="/css/style.css">
    <link rel="stylesheet" href="/css/template-detail.css">
</head>
<body>
    <header class="header">
        <div class="container">
            <div class="header-content">
                <div class="logo">
                    <a href="${isZh ? '/' : '/en/'}">
                        <img src="/images/logo.png" alt="ProductMind AI">
                    </a>
                </div>
                <nav class="nav">
                    <a href="${isZh ? '/' : '/en/'}" class="nav-link">${isZh ? '首页' : 'Home'}</a>
                    <a href="${isZh ? '/ai-products' : '/en/ai-products'}" class="nav-link">${isZh ? 'AI产品' : 'AI Products'}</a>
                </nav>
            </div>
        </div>
    </header>

    ${breadcrumbHtml}

    <main class="main">
        <div class="container">
            <article class="template-detail">
                <header class="template-header">
                    <h1>${isZh ? project.name_zh || project.name : project.name_en || project.name}</h1>
                    <p class="template-subtitle">${template.name_zh || template.name_en}</p>
                </header>
                
                <div class="template-content">
                    ${content || ''}
                </div>
                
                <footer class="template-footer">
                    <div class="template-meta">
                        <span class="template-date">${isZh ? '生成时间' : 'Generated'}: ${new Date(record.created_at).toLocaleDateString()}</span>
                    </div>
                </footer>
            </article>
        </div>
    </main>

    <footer class="footer">
        <div class="container">
            <p>&copy; 2024 ProductMind AI. ${isZh ? '保留所有权利' : 'All rights reserved'}.</p>
        </div>
    </footer>
</body>
</html>`;
}

// 运行生成器
generateSingleTemplate(); 