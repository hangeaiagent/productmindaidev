#!/usr/bin/env node

/**
 * 通用AI产品功能Demo生成器
 * 支持为任何AI产品动态生成个性化的功能演示界面
 * 让AI自主分析产品特点并设计最佳交互方式
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 从环境变量获取配置，避免敏感信息泄露
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ 请设置环境变量: VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

if (!DEEPSEEK_API_KEY && !OPENAI_API_KEY) {
    console.error('❌ 请设置环境变量: DEEPSEEK_API_KEY 或 OPENAI_API_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 调用AI分析产品并生成交互设计方案
 */
async function analyzeProductAndDesignDemo(projectName, projectDescription, category) {
    const analysisPrompt = `
请分析这个AI产品，并为其设计一个最小原型功能前端界面Demo：

产品名称：${projectName}
产品描述：${projectDescription}
产品分类：${category}

请你作为一个资深的产品经理和UI设计师，分析这个产品的核心功能和用户需求，然后设计一个简洁有效的交互界面。

请按以下JSON格式返回分析结果：
{
  "productAnalysis": {
    "coreFunction": "产品的核心功能是什么",
    "targetUsers": "目标用户群体",
    "keyFeatures": ["核心特性1", "核心特性2", "核心特性3"],
    "interactionType": "最适合的交互方式类型"
  },
  "designConcept": {
    "primaryColor": "#hex色值 - 主色调",
    "secondaryColor": "#hex色值 - 辅助色",
    "accentColor": "#hex色值 - 强调色",
    "backgroundStyle": "背景风格描述",
    "designTheme": "设计主题风格",
    "logoStyle": "logo设计理念"
  },
  "interactionFlow": {
    "steps": [
      {
        "stepNumber": 1,
        "title": "步骤标题",
        "description": "步骤描述",
        "uiElements": ["需要的UI元素1", "需要的UI元素2"]
      }
    ],
    "inputTypes": ["需要的输入类型"],
    "outputTypes": ["预期的输出类型"]
  },
  "uiComponents": {
    "header": "页面头部设计说明",
    "mainArea": "主要操作区域设计",
    "sidebar": "侧边栏设计（如果需要）",
    "footer": "页面底部设计"
  }
}

请确保设计方案：
1. 符合产品的实际功能特点
2. 用户体验简洁直观
3. 视觉风格与产品定位匹配
4. 交互流程合理高效
5. 具有现代AI产品的专业感

不要使用固定的模板，请根据具体产品特点进行个性化设计。
`;

    try {
        const response = await callAI(analysisPrompt);
        return JSON.parse(response);
    } catch (error) {
        console.error('AI分析失败:', error);
        return null;
    }
}

/**
 * 根据AI分析结果生成具体的前端代码
 */
async function generateFrontendCode(designSpec, projectName, projectDescription) {
    const codePrompt = `
基于以下产品分析和设计规范，生成一个完整的React组件代码，实现${projectName}的功能Demo界面：

设计规范：
${JSON.stringify(designSpec, null, 2)}

产品信息：
- 名称：${projectName}
- 描述：${projectDescription}

请生成一个完整的React组件，要求：
1. 使用现代的React Hooks语法
2. 包含完整的交互功能（前端模拟，不需要真实后端）
3. 使用Tailwind CSS进行样式设计
4. 添加适当的加载状态和反馈
5. 包含响应式设计
6. 添加图标和动画效果
7. 模拟真实的AI处理过程和结果展示

请直接返回完整的JSX代码，不需要额外说明。
`;

    try {
        const response = await callAI(codePrompt);
        return response;
    } catch (error) {
        console.error('代码生成失败:', error);
        return null;
    }
}

/**
 * 调用AI API
 */
async function callAI(prompt) {
    // 优先使用DeepSeek，fallback到OpenAI
    if (DEEPSEEK_API_KEY) {
        return await callDeepSeek(prompt);
    } else if (OPENAI_API_KEY) {
        return await callOpenAI(prompt);
    }
    throw new Error('没有可用的AI API');
}

/**
 * 调用DeepSeek API
 */
async function callDeepSeek(prompt) {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 4000
        })
    });

    if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

/**
 * 调用OpenAI API
 */
async function callOpenAI(prompt) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: 'gpt-4',
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 4000
        })
    });

    if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

/**
 * 获取项目数据
 */
async function getProject(projectId) {
    if (projectId) {
        const { data, error } = await supabase
            .from('user_projects')
            .select('*')
            .eq('id', projectId)
            .single();
        
        if (error) {
            console.error('获取项目失败:', error);
            return null;
        }
        return data;
    } else {
        // 随机获取一个有primary_category的项目
        const { data, error } = await supabase
            .from('user_projects')
            .select('*')
            .not('primary_category', 'is', null)
            .limit(1);
        
        if (error || !data.length) {
            console.error('获取项目失败:', error);
            return null;
        }
        return data[0];
    }
}

/**
 * 生成完整的HTML页面
 */
function generateHTMLPage(designSpec, frontendCode, project) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${project.name} - AI产品功能演示 | ProductMind AI</title>
    <meta name="description" content="${project.description.substring(0, 160)}...">
    <meta name="keywords" content="${project.name}, ${project.primary_category}, AI产品, 人工智能, 功能演示">
    <meta name="robots" content="index, follow">
    
    <!-- Open Graph -->
    <meta property="og:title" content="${project.name} - AI产品功能演示">
    <meta property="og:description" content="${project.description.substring(0, 160)}...">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="ProductMind AI">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${project.name} - AI产品功能演示">
    <meta name="twitter:description" content="${project.description.substring(0, 160)}...">
    
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- React 18 -->
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    
    <!-- Babel for JSX -->
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    
    <!-- Lucide Icons -->
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
    
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: ${designSpec.designConcept.backgroundStyle || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
        }
        
        .ai-gradient {
            background: linear-gradient(135deg, ${designSpec.designConcept.primaryColor} 0%, ${designSpec.designConcept.secondaryColor} 100%);
        }
        
        .accent-color {
            color: ${designSpec.designConcept.accentColor};
        }
        
        .glass-effect {
            backdrop-filter: blur(10px);
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
    </style>
</head>
<body class="min-h-screen">
    <div id="root"></div>
    
    <script type="text/babel">
        const { useState, useEffect, useRef } = React;
        
        // 在这里插入生成的React组件代码
        ${frontendCode}
        
        // 渲染应用
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<ProductDemo />);
    </script>
</body>
</html>`;
}

/**
 * 主函数
 */
async function main() {
    console.log('🚀 启动AI产品Demo生成器...');
    
    // 获取命令行参数
    const projectId = process.argv[2];
    
    try {
        // 1. 获取项目数据
        console.log('📊 获取项目数据...');
        const project = await getProject(projectId);
        if (!project) {
            console.error('❌ 未找到项目数据');
            return;
        }
        
        console.log(`✅ 项目: ${project.name}`);
        console.log(`📝 描述: ${project.description.substring(0, 100)}...`);
        
        // 2. AI分析产品特点并设计交互方案
        console.log('🤖 AI分析产品特点并设计交互方案...');
        const designSpec = await analyzeProductAndDesignDemo(
            project.name,
            project.description,
            project.primary_category
        );
        
        if (!designSpec) {
            console.error('❌ AI分析失败');
            return;
        }
        
        console.log('✅ 设计方案生成完成');
        console.log(`🎨 主题: ${designSpec.designConcept.designTheme}`);
        console.log(`🔄 交互步骤: ${designSpec.interactionFlow.steps.length}步`);
        
        // 3. 根据设计方案生成前端代码
        console.log('💻 生成前端代码...');
        const frontendCode = await generateFrontendCode(designSpec, project.name, project.description);
        
        if (!frontendCode) {
            console.error('❌ 前端代码生成失败');
            return;
        }
        
        // 4. 生成完整的HTML页面
        console.log('📄 生成HTML页面...');
        const htmlContent = generateHTMLPage(designSpec, frontendCode, project);
        
        // 5. 保存文件
        const outputDir = path.join(__dirname, 'static-pages');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const filename = `${project.id}.html`;
        const filepath = path.join(outputDir, filename);
        
        fs.writeFileSync(filepath, htmlContent, 'utf8');
        
        // 6. 保存设计规范
        const specFilename = `${project.id}-spec.json`;
        const specFilepath = path.join(outputDir, specFilename);
        fs.writeFileSync(specFilepath, JSON.stringify(designSpec, null, 2), 'utf8');
        
        console.log('✅ 生成完成!');
        console.log(`📁 页面文件: ${filepath}`);
        console.log(`📋 设计规范: ${specFilepath}`);
        console.log(`🌐 访问链接: http://localhost:3030/${filename}`);
        
    } catch (error) {
        console.error('❌ 生成失败:', error);
    }
}

// 执行主函数
if (require.main === module) {
    main();
}

module.exports = { main, analyzeProductAndDesignDemo, generateFrontendCode }; 