#!/usr/bin/env node

/**
 * 智能AI产品功能Demo生成器
 * 让AI自主分析产品特点并设计最佳交互方式
 * 支持400+个不同产品的个性化Demo生成
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 从环境变量获取配置，避免敏感信息泄露
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 检查必需的环境变量
if (!supabaseUrl || !supabaseKey) {
    console.error('❌ 请设置环境变量: VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY');
    console.log('💡 示例: export VITE_SUPABASE_URL="your_url"');
    process.exit(1);
}

if (!DEEPSEEK_API_KEY && !OPENAI_API_KEY) {
    console.error('❌ 请设置环境变量: DEEPSEEK_API_KEY 或 OPENAI_API_KEY');
    console.log('💡 示例: export DEEPSEEK_API_KEY="your_key"');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 第一阶段：AI分析产品特点和用户需求
 */
async function analyzeProduct(projectName, projectDescription, category) {
    const analysisPrompt = `
作为资深产品分析师，请深度分析这个AI产品：

产品名称：${projectName}
产品描述：${projectDescription}
产品分类：${category}

请分析并返回JSON格式：
{
  "productType": "产品类型（如：图像处理、对话AI、文本生成、数据分析等）",
  "coreFunction": "核心功能一句话概括",
  "targetUsers": "目标用户群体",
  "keyFeatures": ["核心特性1", "核心特性2", "核心特性3"],
  "usageScenarios": ["使用场景1", "使用场景2"],
  "inputMethod": "最佳输入方式（文件上传、文本输入、语音输入等）",
  "outputFormat": "输出格式（图片、文本、音频、数据报告等）",
  "processingFlow": "处理流程描述",
  "uniqueValue": "独特价值点"
}

请基于产品描述进行分析，不要使用模板化回答。
`;

    return await callAI(analysisPrompt);
}

/**
 * 第二阶段：设计个性化的视觉风格和交互方案
 */
async function designUserInterface(productAnalysis, projectName) {
    const designPrompt = `
基于以下产品分析结果，为 ${projectName} 设计个性化的视觉风格和交互方案：

产品分析：
${JSON.stringify(productAnalysis, null, 2)}

请设计并返回JSON格式：
{
  "visualDesign": {
    "designTheme": "设计主题（如：科技简约、温暖专业、未来科幻等）",
    "primaryColor": "#hex色值",
    "secondaryColor": "#hex色值", 
    "accentColor": "#hex色值",
    "backgroundColor": "背景样式CSS代码",
    "fontStyle": "字体风格描述",
    "logoConceptа": "logo设计理念"
  },
  "interactionDesign": {
    "layoutType": "布局类型（单列、双列、卡片式等）",
    "navigationStyle": "导航风格",
    "inputAreaDesign": "输入区域设计",
    "outputAreaDesign": "输出区域设计",
    "feedbackDesign": "反馈机制设计"
  },
  "userFlow": [
    {
      "step": 1,
      "title": "步骤标题",
      "description": "具体操作",
      "uiComponents": ["所需UI组件"],
      "userAction": "用户操作",
      "systemResponse": "系统响应"
    }
  ]
}

请确保设计：
1. 符合产品功能特点
2. 体现品牌个性
3. 用户体验流畅
4. 视觉层次清晰
`;

    return await callAI(designPrompt);
}

/**
 * 第三阶段：生成完整的React组件代码
 */
async function generateReactComponent(productAnalysis, designSpec, projectName, projectDescription) {
    const codePrompt = `
基于以下规范，为 ${projectName} 生成完整的React组件：

产品分析：${JSON.stringify(productAnalysis, null, 2)}
设计规范：${JSON.stringify(designSpec, null, 2)}

生成要求：
1. 使用React Hooks (useState, useEffect等)
2. 使用Tailwind CSS样式
3. 包含完整的交互功能（前端模拟，不需要真实API）
4. 添加Lucide React图标
5. 包含加载状态、成功/错误反馈
6. 响应式设计
7. 动画效果和过渡
8. 模拟真实的AI处理过程

组件结构：
- 头部：产品标题、描述、导航
- 主要区域：根据产品特点设计的功能界面
- 侧边栏：相关信息、帮助提示
- 底部：操作按钮、状态显示

请直接返回完整的JSX代码，组件名为 ProductDemo。
不要包含import语句，假设所有依赖已导入。
`;

    return await callAI(codePrompt);
}

/**
 * 第四阶段：生成SEO优化的HTML页面
 */
function generateSEOPage(productAnalysis, designSpec, reactCode, project) {
    const seoKeywords = [
        project.name,
        productAnalysis.productType,
        productAnalysis.coreFunction,
        'AI产品',
        '人工智能',
        '功能演示'
    ].join(', ');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${project.name} - ${productAnalysis.coreFunction} | ProductMind AI</title>
    <meta name="description" content="${productAnalysis.coreFunction}。${project.description.substring(0, 120)}...">
    <meta name="keywords" content="${seoKeywords}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://productmindai.com/demo/${project.id}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://productmindai.com/demo/${project.id}">
    <meta property="og:title" content="${project.name} - AI产品功能演示">
    <meta property="og:description" content="${productAnalysis.coreFunction}">
    <meta property="og:site_name" content="ProductMind AI">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="https://productmindai.com/demo/${project.id}">
    <meta property="twitter:title" content="${project.name} - AI产品功能演示">
    <meta property="twitter:description" content="${productAnalysis.coreFunction}">
    
    <!-- 结构化数据 -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "${project.name}",
      "description": "${project.description}",
      "applicationCategory": "${productAnalysis.productType}",
      "author": {
        "@type": "Organization",
        "name": "ProductMind AI"
      },
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "CNY"
      }
    }
    </script>
    
    <!-- 样式和脚本 -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
    
    <style>
        :root {
            --primary-color: ${designSpec.visualDesign.primaryColor};
            --secondary-color: ${designSpec.visualDesign.secondaryColor};
            --accent-color: ${designSpec.visualDesign.accentColor};
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            ${designSpec.visualDesign.backgroundColor}
        }
        
        .primary-gradient {
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
        }
        
        .glass-effect {
            backdrop-filter: blur(16px);
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .animate-float {
            animation: float 6s ease-in-out infinite;
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
        }
    </style>
</head>
<body>
    <div id="root"></div>
    
    <script type="text/babel">
        const { useState, useEffect, useRef } = React;
        
        ${reactCode}
        
        // 渲染应用
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<ProductDemo />);
    </script>
</body>
</html>`;
}

/**
 * AI API调用函数
 */
async function callAI(prompt) {
    try {
        if (DEEPSEEK_API_KEY) {
            return await callDeepSeek(prompt);
        } else if (OPENAI_API_KEY) {
            return await callOpenAI(prompt);
        }
    } catch (error) {
        console.error('AI调用失败:', error);
        throw error;
    }
}

async function callDeepSeek(prompt) {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 4000
        })
    });

    if (!response.ok) {
        throw new Error(`DeepSeek API错误: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

async function callOpenAI(prompt) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: 'gpt-4',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 4000
        })
    });

    if (!response.ok) {
        throw new Error(`OpenAI API错误: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

/**
 * 获取项目数据
 */
async function getProject(projectId) {
    try {
        if (projectId) {
            const { data, error } = await supabase
                .from('user_projects')
                .select('*')
                .eq('id', projectId)
                .single();
            
            if (error) throw error;
            return data;
        } else {
            // 随机获取一个有primary_category的项目用于测试
            const { data, error } = await supabase
                .from('user_projects')
                .select('*')
                .not('primary_category', 'is', null)
                .limit(10);
            
            if (error || !data.length) throw error;
            return data[Math.floor(Math.random() * data.length)];
        }
    } catch (error) {
        console.error('获取项目数据失败:', error);
        return null;
    }
}

/**
 * 主执行函数
 */
async function main() {
    console.log('🚀 启动智能AI产品Demo生成器...');
    console.log('🤖 让AI自主分析产品特点并设计个性化交互界面\n');
    
    const projectId = process.argv[2];
    
    try {
        // 第一步：获取项目数据
        console.log('📊 第1步：获取项目数据...');
        const project = await getProject(projectId);
        if (!project) {
            console.error('❌ 未找到项目数据');
            return;
        }
        
        console.log(`✅ 项目: ${project.name}`);
        console.log(`📝 分类: ${project.primary_category}`);
        console.log(`📄 描述: ${project.description.substring(0, 100)}...\n`);
        
        // 第二步：AI分析产品特点
        console.log('🧠 第2步：AI分析产品特点和用户需求...');
        const analysisResult = await analyzeProduct(
            project.name,
            project.description,
            project.primary_category
        );
        const productAnalysis = JSON.parse(analysisResult);
        
        console.log(`✅ 产品类型: ${productAnalysis.productType}`);
        console.log(`🎯 核心功能: ${productAnalysis.coreFunction}`);
        console.log(`👥 目标用户: ${productAnalysis.targetUsers}\n`);
        
        // 第三步：设计个性化界面
        console.log('🎨 第3步：设计个性化视觉风格和交互方案...');
        const designResult = await designUserInterface(productAnalysis, project.name);
        const designSpec = JSON.parse(designResult);
        
        console.log(`✅ 设计主题: ${designSpec.visualDesign.designTheme}`);
        console.log(`🎨 主色调: ${designSpec.visualDesign.primaryColor}`);
        console.log(`📱 布局类型: ${designSpec.interactionDesign.layoutType}\n`);
        
        // 第四步：生成React组件
        console.log('💻 第4步：生成React组件代码...');
        const reactCode = await generateReactComponent(
            productAnalysis,
            designSpec,
            project.name,
            project.description
        );
        
        console.log('✅ React组件生成完成\n');
        
        // 第五步：生成SEO页面
        console.log('📄 第5步：生成SEO优化的HTML页面...');
        const htmlContent = generateSEOPage(productAnalysis, designSpec, reactCode, project);
        
        // 保存文件
        const outputDir = path.join(__dirname, 'static-pages');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const filename = `${project.id}.html`;
        const filepath = path.join(outputDir, filename);
        fs.writeFileSync(filepath, htmlContent, 'utf8');
        
        // 保存设计规范和分析结果
        const metaData = {
            project: {
                id: project.id,
                name: project.name,
                description: project.description,
                category: project.primary_category
            },
            analysis: productAnalysis,
            design: designSpec,
            generatedAt: new Date().toISOString()
        };
        
        const metaFilepath = path.join(outputDir, `${project.id}-meta.json`);
        fs.writeFileSync(metaFilepath, JSON.stringify(metaData, null, 2), 'utf8');
        
        console.log('🎉 生成完成！');
        console.log(`📁 HTML文件: ${filepath}`);
        console.log(`📋 元数据: ${metaFilepath}`);
        console.log(`🌐 预览链接: http://localhost:3030/${filename}`);
        console.log('\n💡 提示: 运行 node serve-static.cjs 启动预览服务器');
        
    } catch (error) {
        console.error('❌ 生成失败:', error);
        console.log('\n🔧 故障排除:');
        console.log('1. 检查环境变量是否正确设置');
        console.log('2. 检查网络连接和API配额');
        console.log('3. 检查数据库连接');
    }
}

// 批量生成函数
async function batchGenerate(limit = 10) {
    console.log(`🚀 开始批量生成 ${limit} 个产品Demo...\n`);
    
    try {
        const { data: projects, error } = await supabase
            .from('user_projects')
            .select('id, name, primary_category')
            .not('primary_category', 'is', null)
            .limit(limit);
        
        if (error) throw error;
        
        for (let i = 0; i < projects.length; i++) {
            const project = projects[i];
            console.log(`\n📦 处理项目 ${i + 1}/${projects.length}: ${project.name}`);
            
            // 模拟调用main函数的逻辑，但传入具体的项目ID
            process.argv[2] = project.id;
            await main();
            
            // 避免API限制，添加延迟
            if (i < projects.length - 1) {
                console.log('⏳ 等待3秒后继续...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
        
        console.log('\n🎉 批量生成完成！');
        
    } catch (error) {
        console.error('❌ 批量生成失败:', error);
    }
}

// 命令行接口
if (require.main === module) {
    const command = process.argv[2];
    
    if (command === 'batch') {
        const limit = parseInt(process.argv[3]) || 10;
        batchGenerate(limit);
    } else {
        main();
    }
}

module.exports = { main, batchGenerate, analyzeProduct, designUserInterface }; 