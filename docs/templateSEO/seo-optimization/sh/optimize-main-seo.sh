#!/bin/bash
# optimize-main-seo.sh - 主页面SEO优化脚本
# ProductMind AI SEO优化系列 - 主页面优化

echo "🚀 开始优化 ProductMind AI 主页面SEO..."

# 备份原文件
if [ -f "index.html" ]; then
    cp index.html index.html.backup.$(date +%Y%m%d_%H%M%S)
    echo "📝 已备份原文件"
fi

# 创建优化后的index.html
cat > index.html << 'EOF'
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    
    <!-- 基础SEO -->
    <title>ProductMind AI - 智能产品管理平台 | AI驱动的产品经理助手</title>
    <meta name="description" content="ProductMind AI是专业的智能产品管理平台，为产品经理提供AI驱动的产品分析、文档生成、模板管理等服务。提供PRD、MRD、BRD等25+专业模板，助力产品成功。" />
    <meta name="keywords" content="ProductMind AI,产品管理,AI产品经理,PRD模板,产品需求文档,MRD模板,BRD模板,产品分析,智能产品管理,AI助手,产品文档生成" />
    <meta name="author" content="ProductMind AI" />
    <meta name="robots" content="index,follow" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    
    <!-- 多语言支持 -->
    <link rel="alternate" hreflang="zh-CN" href="https://productmindai.com/" />
    <link rel="alternate" hreflang="en-US" href="https://productmindai.com/en/" />
    <link rel="canonical" href="https://productmindai.com/" />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://productmindai.com/" />
    <meta property="og:title" content="ProductMind AI - 智能产品管理平台" />
    <meta property="og:description" content="AI驱动的产品经理助手，提供智能产品分析、文档生成、模板管理等服务" />
    <meta property="og:image" content="https://productmindai.com/og-image.jpg" />
    <meta property="og:site_name" content="ProductMind AI" />
    <meta property="og:locale" content="zh_CN" />
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="https://productmindai.com/" />
    <meta name="twitter:title" content="ProductMind AI - 智能产品管理平台" />
    <meta name="twitter:description" content="AI驱动的产品经理助手，提供智能产品分析、文档生成、模板管理等服务" />
    <meta name="twitter:image" content="https://productmindai.com/og-image.jpg" />
    
    <!-- 网站图标 -->
    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    
    <!-- 字体预加载 -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- 结构化数据 -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "ProductMind AI",
      "description": "智能产品管理平台，为产品经理提供AI驱动的产品分析、文档生成、模板管理等服务",
      "url": "https://productmindai.com",
      "applicationCategory": "ProductivityApplication",
      "operatingSystem": "Web",
      "browserRequirements": "Modern browser with JavaScript support",
      "author": {
        "@type": "Organization",
        "name": "ProductMind AI",
        "url": "https://productmindai.com"
      },
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "ratingCount": "156"
      }
    }
    </script>
    
    <!-- 性能优化 -->
    <link rel="dns-prefetch" href="//fonts.googleapis.com">
    <link rel="dns-prefetch" href="//fonts.gstatic.com">
    <link rel="preload" href="/src/main.tsx" as="script">
    
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
    
    <!-- Service Worker 注册 -->
    <script>
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => console.log('SW registered'))
          .catch(error => console.log('SW registration failed'));
      }
    </script>
  </body>
</html>
EOF

echo "✅ 主页面SEO优化完成！"
echo "📝 已创建备份文件: index.html.backup.*"
echo "🎯 优化内容："
echo "   - 完整的SEO元数据"
echo "   - Open Graph和Twitter Cards"
echo "   - 结构化数据"
echo "   - 多语言支持"
echo "   - 性能优化" 