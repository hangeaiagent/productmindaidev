/**
 * Mermaid处理器 - 外部JavaScript文件
 * 基于 docs/页面样式MermaidDemo成功.md 的验证配置
 * 版本: v2.0.0
 */

/**
 * 初始化Mermaid配置
 */
function initializeMermaid() {
    if (typeof mermaid === 'undefined') {
        console.error('❌ Mermaid库未加载');
        return false;
    }

    try {
        // 使用验证过的配置参数
        mermaid.initialize({
            startOnLoad: true,
            theme: 'default',
            flowchart: {
                useMaxWidth: true,
                htmlLabels: true,
                curve: 'basis'
            },
            themeVariables: {
                primaryColor: '#667eea',
                primaryTextColor: '#333',
                primaryBorderColor: '#764ba2',
                lineColor: '#666',
                secondaryColor: '#f8f9fa',
                tertiaryColor: '#e3f2fd'
            },
            // 错误处理配置
            securityLevel: 'loose',
            maxTextSize: 50000,
            maxEdges: 500
        });
        
        console.log('✅ Mermaid初始化成功');
        return true;
    } catch (error) {
        console.error('❌ Mermaid初始化失败:', error);
        return false;
    }
}

/**
 * 处理单个Mermaid图表
 */
function processMermaidDiagram(container) {
    const loadingElement = container.querySelector('.loading');
    const errorElement = container.querySelector('.error');
    const mermaidElement = container.querySelector('.mermaid');
    
    if (!mermaidElement) {
        console.warn('⚠️ 未找到.mermaid元素');
        return;
    }
    
    try {
        // 隐藏加载提示
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
        // 检查Mermaid内容
        const content = mermaidElement.textContent.trim();
        if (!content) {
            throw new Error('Mermaid内容为空');
        }
        
        // 渲染图表
        mermaid.init(undefined, mermaidElement);
        
        console.log('✅ Mermaid图表渲染成功');
        
        // 添加成功样式
        container.classList.add('mermaid-success');
        
    } catch (error) {
        console.error('❌ Mermaid图表渲染失败:', error);
        
        // 显示错误信息
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        if (errorElement) {
            errorElement.style.display = 'block';
            errorElement.innerHTML = `<p>❌ 流程图渲染失败: ${error.message}</p>`;
        }
        if (mermaidElement) {
            mermaidElement.style.display = 'none';
        }
        
        // 添加错误样式
        container.classList.add('mermaid-error');
    }
}

/**
 * 处理页面中所有Mermaid图表
 */
function processMermaidDiagrams() {
    const containers = document.querySelectorAll('.mermaid-container');
    
    if (containers.length === 0) {
        console.log('ℹ️ 页面中没有找到Mermaid图表');
        return;
    }
    
    console.log(`🔄 开始处理 ${containers.length} 个Mermaid图表...`);
    
    containers.forEach((container, index) => {
        try {
            processMermaidDiagram(container);
        } catch (error) {
            console.error(`❌ 处理第 ${index + 1} 个图表失败:`, error);
        }
    });
}

/**
 * 设置错误处理
 */
function setupErrorHandling() {
    // 全局错误处理
    window.addEventListener('error', function(e) {
        if (e.message && e.message.includes('mermaid')) {
            console.error('🚨 Mermaid相关错误:', e.error);
        }
    });
    
    // 未捕获的Promise错误
    window.addEventListener('unhandledrejection', function(e) {
        if (e.reason && e.reason.toString().includes('mermaid')) {
            console.error('🚨 Mermaid Promise错误:', e.reason);
        }
    });
}

/**
 * 添加动态样式
 */
function addDynamicStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Mermaid成功状态 */
        .mermaid-container.mermaid-success {
            border-color: #4caf50;
        }
        
        .mermaid-container.mermaid-success::before {
            content: "✅";
            position: absolute;
            top: 10px;
            right: 15px;
            font-size: 16px;
            opacity: 0.7;
        }
        
        /* Mermaid错误状态 */
        .mermaid-container.mermaid-error {
            border-color: #f44336;
            background: #ffebee;
        }
        
        .mermaid-container.mermaid-error::before {
            content: "❌";
            position: absolute;
            top: 10px;
            right: 15px;
            font-size: 16px;
        }
        
        /* 加载动画 */
        .loading::before {
            content: "";
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 10px;
            vertical-align: middle;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* SVG图表优化 */
        .mermaid svg {
            max-width: 100%;
            height: auto;
        }
        
        /* 响应式优化 */
        @media (max-width: 768px) {
            .mermaid svg {
                font-size: 12px;
            }
        }
    `;
    document.head.appendChild(style);
}

/**
 * 主初始化函数
 */
function initMermaidHandler() {
    console.log('🚀 Mermaid处理器启动...');
    
    // 设置错误处理
    setupErrorHandling();
    
    // 添加动态样式
    addDynamicStyles();
    
    // 初始化Mermaid
    if (!initializeMermaid()) {
        console.error('❌ Mermaid初始化失败，停止处理');
        return;
    }
    
    // 处理图表
    processMermaidDiagrams();
}

// DOM加载完成后执行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMermaidHandler);
} else {
    // DOM已经加载完成
    initMermaidHandler();
}

// 导出函数供外部调用
window.MermaidHandler = {
    init: initMermaidHandler,
    processDiagrams: processMermaidDiagrams,
    processSingle: processMermaidDiagram
}; 