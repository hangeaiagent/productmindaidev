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

// 检查必需的环境变量
if (!supabaseUrl || !supabaseKey) {
    console.error('❌ 请设置环境变量: VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY');
    console.log('💡 示例: export VITE_SUPABASE_URL="your_url"');
    process.exit(1);
}

if (!DEEPSEEK_API_KEY) {
    console.error('❌ 请设置环境变量: DEEPSEEK_API_KEY');
    console.log('💡 示例: export DEEPSEEK_API_KEY="your_key"');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 第一阶段：AI分析产品特点
 */
async function analyzeProduct(projectName, projectDescription, category) {
    const analysisPrompt = `
请深度分析这个AI产品并返回JSON格式：

产品名称：${projectName}
产品描述：${projectDescription}
产品分类：${category}

返回格式：
{
  "productType": "产品类型",
  "coreFunction": "核心功能",
  "targetUsers": "目标用户",
  "keyFeatures": ["特性1", "特性2", "特性3"],
  "inputMethod": "输入方式",
  "outputFormat": "输出格式",
  "uniqueValue": "独特价值"
}

请基于实际描述分析，不要用模板回答。
`;

    return await callAI(analysisPrompt);
}

/**
 * 第二阶段：设计个性化UI
 */
async function designUserInterface(productAnalysis, projectName) {
    const designPrompt = `
为 ${projectName} 设计个性化的界面，基于分析：
${JSON.stringify(productAnalysis, null, 2)}

返回JSON格式：
{
  "visualDesign": {
    "designTheme": "设计主题",
    "primaryColor": "#颜色值",
    "secondaryColor": "#颜色值", 
    "accentColor": "#颜色值",
    "backgroundColor": "背景CSS",
    "logoIdea": "logo理念"
  },
  "userFlow": [
    {
      "step": 1,
      "title": "步骤名称",
      "action": "用户操作",
      "components": ["UI组件"]
    }
  ]
}

设计要求：符合产品特点，用户体验好，视觉现代化。
`;

    return await callAI(designPrompt);
}

/**
 * 第三阶段：生成React代码
 */
async function generateReactComponent(productAnalysis, designSpec, projectName) {
    const codePrompt = `
为 ${projectName} 生成完整React组件：

产品分析：${JSON.stringify(productAnalysis, null, 2)}
设计规范：${JSON.stringify(designSpec, null, 2)}

要求：
1. 使用React Hooks
2. Tailwind CSS样式
3. 完整交互功能（前端模拟）
4. Lucide图标
5. 加载状态和反馈
6. 响应式设计
7. 动画效果

请返回完整JSX代码，组件名为ProductDemo。
不要import语句，假设依赖已导入。
`;

    return await callAI(codePrompt);
}

/**
 * AI API调用
 */
async function callAI(prompt) {
    try {
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
            throw new Error(`API错误: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('AI调用失败:', error);
        throw error;
    }
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
            // 随机获取一个测试项目
            const { data, error } = await supabase
                .from('user_projects')
                .select('*')
                .not('primary_category', 'is', null)
                .limit(5);
            
            if (error || !data.length) throw error;
            return data[Math.floor(Math.random() * data.length)];
        }
    } catch (error) {
        console.error('获取项目失败:', error);
        return null;
    }
}

/**
 * 生成完整HTML页面
 */
function generateHTMLPage(productAnalysis, designSpec, reactCode, project) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${project.name} - ${productAnalysis.coreFunction} | ProductMind AI</title>
    <meta name="description" content="${project.description.substring(0, 160)}">
    <meta name="keywords" content="${project.name}, ${productAnalysis.productType}, AI产品">
    
    <!-- SEO优化 -->
    <meta property="og:title" content="${project.name} - AI产品演示">
    <meta property="og:description" content="${productAnalysis.coreFunction}">
    <meta property="og:type" content="website">
    
    <!-- 依赖库 -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
    
    <style>
        body {
            font-family: 'Inter', sans-serif;
            ${designSpec.visualDesign.backgroundColor || 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);'}
        }
        
        .primary-color { color: ${designSpec.visualDesign.primaryColor}; }
        .secondary-color { color: ${designSpec.visualDesign.secondaryColor}; }
        .accent-color { color: ${designSpec.visualDesign.accentColor}; }
        
        .primary-bg { background: ${designSpec.visualDesign.primaryColor}; }
        .secondary-bg { background: ${designSpec.visualDesign.secondaryColor}; }
        
        .glass-effect {
            backdrop-filter: blur(16px);
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
    </style>
</head>
<body>
    <div id="root"></div>
    
    <script type="text/babel">
        const { useState, useEffect, useRef } = React;
        
        ${reactCode}
        
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<ProductDemo />);
    </script>
</body>
</html>`;
}

/**
 * 主执行函数
 */
async function main() {
    console.log('🚀 启动智能AI产品Demo生成器');
    console.log('🤖 AI将自主分析产品并设计个性化界面\n');
    
    const projectId = process.argv[2];
    
    try {
        // 1. 获取项目
        console.log('📊 获取项目数据...');
        const project = await getProject(projectId);
        if (!project) {
            console.error('❌ 未找到项目');
            return;
        }
        
        console.log(`✅ 项目: ${project.name}`);
        console.log(`📝 分类: ${project.primary_category || '未分类'}`);
        
        // 2. AI分析
        console.log('\n🧠 AI分析产品特点...');
        const analysisResult = await analyzeProduct(
            project.name,
            project.description,
            project.primary_category
        );
        const productAnalysis = JSON.parse(analysisResult);
        
        console.log(`✅ 产品类型: ${productAnalysis.productType}`);
        console.log(`🎯 核心功能: ${productAnalysis.coreFunction}`);
        
        // 3. 设计界面
        console.log('\n🎨 设计个性化界面...');
        const designResult = await designUserInterface(productAnalysis, project.name);
        const designSpec = JSON.parse(designResult);
        
        console.log(`✅ 设计主题: ${designSpec.visualDesign.designTheme}`);
        console.log(`🎨 主色调: ${designSpec.visualDesign.primaryColor}`);
        
        // 4. 生成代码
        console.log('\n💻 生成React组件...');
        const reactCode = await generateReactComponent(
            productAnalysis,
            designSpec,
            project.name
        );
        
        // 5. 生成页面
        console.log('\n📄 生成HTML页面...');
        const htmlContent = generateHTMLPage(productAnalysis, designSpec, reactCode, project);
        
        // 6. 保存文件
        const outputDir = path.join(__dirname, 'static-pages');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const filename = `${project.id}.html`;
        const filepath = path.join(outputDir, filename);
        fs.writeFileSync(filepath, htmlContent, 'utf8');
        
        // 保存元数据
        const metaData = {
            project: { id: project.id, name: project.name },
            analysis: productAnalysis,
            design: designSpec,
            timestamp: new Date().toISOString()
        };
        
        const metaPath = path.join(outputDir, `${project.id}-meta.json`);
        fs.writeFileSync(metaPath, JSON.stringify(metaData, null, 2));
        
        console.log('\n🎉 生成完成！');
        console.log(`📁 页面: ${filepath}`);
        console.log(`📋 元数据: ${metaPath}`);
        console.log(`🌐 访问: http://localhost:3030/${filename}`);
        
    } catch (error) {
        console.error('\n❌ 生成失败:', error);
    }
}

// 批量生成
async function batchGenerate() {
    console.log('🚀 开始批量生成...\n');
    
    try {
        const { data: projects } = await supabase
            .from('user_projects')
            .select('id, name')
            .not('primary_category', 'is', null)
            .limit(5);
        
        for (let i = 0; i < projects.length; i++) {
            console.log(`\n📦 处理 ${i + 1}/${projects.length}: ${projects[i].name}`);
            process.argv[2] = projects[i].id;
            await main();
            
            // 延迟避免API限制
            if (i < projects.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
        
        console.log('\n🎉 批量生成完成！');
        
    } catch (error) {
        console.error('❌ 批量生成失败:', error);
    }
}

// 命令行入口
if (require.main === module) {
    if (process.argv[2] === 'batch') {
        batchGenerate();
    } else {
        main();
    }
}

module.exports = { main, batchGenerate }; 