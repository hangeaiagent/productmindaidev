#!/bin/bash

# AI Products 页面环境变量配置脚本
# 确保 Netlify Functions 能够访问正确的数据库配置

set -e

echo "🔧 配置 AI Products 页面环境变量..."

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 请在项目根目录运行此脚本"
    exit 1
fi

# 从 aws-backend/.env 读取配置（如果存在）
ENV_FILE="aws-backend/.env"
if [ -f "$ENV_FILE" ]; then
    echo "📁 发现 aws-backend/.env 文件"
    
    # 提取 Supabase 配置
    SUPABASE_URL=$(grep "SUPABASE_URL=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    SUPABASE_ANON_KEY=$(grep "SUPABASE_ANON_KEY=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    
    if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_ANON_KEY" ]; then
        echo "✅ 从 aws-backend/.env 读取到 Supabase 配置"
        echo "   URL: ${SUPABASE_URL:0:30}..."
        echo "   KEY: ${SUPABASE_ANON_KEY:0:20}..."
        
        # 创建/更新项目根目录的 .env 文件
        echo "📝 更新根目录 .env 文件..."
        cat > .env << EOF
# Supabase 配置 (从 aws-backend/.env 复制)
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

# Netlify Functions 配置
NETLIFY_FUNCTIONS_PORT=8888
EOF
        echo "✅ 根目录 .env 文件已更新"
    else
        echo "⚠️ aws-backend/.env 中未找到完整的 Supabase 配置"
    fi
else
    echo "⚠️ 未找到 aws-backend/.env 文件"
    echo "📝 使用默认配置创建 .env 文件..."
    
    # 使用默认配置
    cat > .env << EOF
# Supabase 配置 (请手动设置正确的值)
VITE_SUPABASE_URL=https://uobwbhvwrciaxloqdizc.supabase.co
VITE_SUPABASE_ANON_KEY=请在此处设置您的密钥

# Netlify Functions 配置
NETLIFY_FUNCTIONS_PORT=8888
EOF
    echo "⚠️ 请手动编辑 .env 文件设置正确的 SUPABASE_ANON_KEY"
fi

# 检查 netlify.toml 配置
echo "🔧 检查 Netlify 配置..."
if [ ! -f "netlify.toml" ]; then
    echo "📝 创建 netlify.toml 文件..."
    cat > netlify.toml << 'EOF'
[build]
  functions = "netlify/functions-js"
  
[dev]
  port = 8888
  functions = "netlify/functions-js"
  
[functions]
  directory = "netlify/functions-js"
  
[[headers]]
  for = "/.netlify/functions/*"
  [headers.values]
    Access-Control-Allow-Origin = "*"
    Access-Control-Allow-Headers = "Content-Type"
    Access-Control-Allow-Methods = "GET, POST, OPTIONS"
EOF
    echo "✅ netlify.toml 已创建"
else
    echo "✅ netlify.toml 已存在"
fi

# 验证函数文件
echo "🔍 验证函数文件..."
FUNCTIONS_DIR="netlify/functions-js"

if [ ! -d "$FUNCTIONS_DIR" ]; then
    echo "❌ 函数目录不存在: $FUNCTIONS_DIR"
    exit 1
fi

REQUIRED_FILES=("get-categories.cjs" "get-projects-by-category.cjs")
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$FUNCTIONS_DIR/$file" ]; then
        echo "❌ 缺少必需文件: $FUNCTIONS_DIR/$file"
        exit 1
    else
        echo "✅ 找到函数文件: $file"
    fi
done

# 测试环境变量加载
echo "🧪 测试环境变量..."
if [ -f ".env" ]; then
    source .env
    if [ -n "$VITE_SUPABASE_URL" ]; then
        echo "✅ VITE_SUPABASE_URL: ${VITE_SUPABASE_URL:0:30}..."
    else
        echo "❌ VITE_SUPABASE_URL 未设置"
    fi
    
    if [ -n "$VITE_SUPABASE_ANON_KEY" ] && [ "$VITE_SUPABASE_ANON_KEY" != "请在此处设置您的密钥" ]; then
        echo "✅ VITE_SUPABASE_ANON_KEY: ${VITE_SUPABASE_ANON_KEY:0:20}..."
    else
        echo "❌ VITE_SUPABASE_ANON_KEY 未正确设置"
    fi
fi

echo ""
echo "🎉 环境配置完成！"
echo ""
echo "📋 接下来的步骤："
echo "1. 检查 .env 文件中的配置是否正确"
echo "2. 启动本地开发服务器："
echo "   npx netlify dev --port 8888"
echo "3. 访问 AI Products 页面："
echo "   http://localhost:8888/ai-products"
echo ""
echo "🔧 如果遇到问题："
echo "- 确保 aws-backend/.env 中有正确的 Supabase 配置"
echo "- 检查数据库表 user_projectscategory 和 user_projects 是否存在"
echo "- 查看浏览器控制台和函数日志"

echo "请运行: npx netlify dev --port 8888" 