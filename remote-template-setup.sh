#!/bin/bash

# 远程服务器模板详情页面设置脚本
# 用于移动现有文件并生成新的模板详情页面

echo "🚀 ProductMind AI 模板详情页面设置脚本"
echo "========================================"

# 设置工作目录
WORK_DIR="/home/productmindaidev"
cd $WORK_DIR

echo "📍 当前工作目录: $(pwd)"

# 1. 创建static目录结构
echo "📁 创建static目录结构..."
mkdir -p static/pdhtml
echo "✅ 创建目录: static/pdhtml"

# 2. 移动现有文件从aws-backend/pdhtml到static/pdhtml
if [ -d "aws-backend/pdhtml" ]; then
    echo "📦 移动现有文件..."
    
    # 统计文件数量
    FILE_COUNT=$(find aws-backend/pdhtml -name "*.html" | wc -l)
    echo "📊 发现 $FILE_COUNT 个HTML文件"
    
    # 移动文件，保持目录结构
    rsync -av aws-backend/pdhtml/ static/pdhtml/
    
    # 验证移动结果
    MOVED_COUNT=$(find static/pdhtml -name "*.html" | wc -l)
    echo "✅ 已移动 $MOVED_COUNT 个文件到 static/pdhtml/"
    
    # 备份原目录（可选）
    if [ "$FILE_COUNT" -eq "$MOVED_COUNT" ]; then
        echo "🗂️  创建备份目录..."
        mv aws-backend/pdhtml aws-backend/pdhtml.backup.$(date +%Y%m%d_%H%M%S)
        echo "✅ 原目录已备份"
    fi
else
    echo "⚠️  aws-backend/pdhtml 目录不存在，跳过文件移动"
fi

# 3. 检查环境变量
echo "🔧 检查环境变量..."
if [ -f "aws-backend/.env" ]; then
    echo "✅ 环境变量文件存在: aws-backend/.env"
    # 显示环境变量状态（不显示具体值）
    if grep -q "VITE_SUPABASE_URL" aws-backend/.env; then
        echo "✅ VITE_SUPABASE_URL: 已配置"
    else
        echo "❌ VITE_SUPABASE_URL: 未配置"
    fi
    
    if grep -q "VITE_SUPABASE_SERVICE_ROLE_KEY\|VITE_SUPABASE_ANON_KEY" aws-backend/.env; then
        echo "✅ Supabase密钥: 已配置"
    else
        echo "❌ Supabase密钥: 未配置"
    fi
else
    echo "❌ 环境变量文件不存在: aws-backend/.env"
    echo "请先配置环境变量文件"
    exit 1
fi

# 4. 检查依赖包
echo "📦 检查Node.js依赖..."
cd aws-backend
if [ -f "package.json" ]; then
    if ! npm list marked highlight.js >/dev/null 2>&1; then
        echo "🔄 安装缺失的依赖包..."
        npm install marked highlight.js
    fi
    echo "✅ 依赖包检查完成"
else
    echo "⚠️  package.json 不存在，请手动安装依赖"
fi

# 5. 生成指定项目的模板详情页面
echo "🎯 生成模板详情页面..."
PROJECT_ID="b6bf6237-a8d2-4910-836f-6477604f0a2d"

echo "📋 目标项目ID: $PROJECT_ID"
echo "🔄 执行模板生成器..."

# 执行生成器
node enhanced-template-generator.mjs

echo "📊 检查生成结果..."
if [ -d "../static/pdhtml/$PROJECT_ID" ]; then
    FILE_COUNT=$(find "../static/pdhtml/$PROJECT_ID" -name "*.html" | wc -l)
    echo "✅ 成功生成 $FILE_COUNT 个模板详情页面"
    echo "📁 输出目录: static/pdhtml/$PROJECT_ID/"
    
    # 列出生成的文件
    echo "📄 生成的文件列表:"
    ls -la "../static/pdhtml/$PROJECT_ID/"
else
    echo "❌ 生成失败，未找到输出目录"
fi

# 6. 显示统计信息
echo ""
echo "📊 最终统计:"
echo "============"
TOTAL_PROJECTS=$(find ../static/pdhtml -maxdepth 1 -type d | grep -v "^../static/pdhtml$" | wc -l)
TOTAL_FILES=$(find ../static/pdhtml -name "*.html" | wc -l)
echo "📁 项目目录数量: $TOTAL_PROJECTS"
echo "📄 HTML文件总数: $TOTAL_FILES"

echo ""
echo "🎉 设置完成！"
echo "💡 提示:"
echo "   - 模板详情页面路径: static/pdhtml/<project_id>/<template_version_id>.html"
echo "   - 可通过静态文件服务器访问: /static/pdhtml/..."
echo "   - 原文件已备份到: aws-backend/pdhtml.backup.*"

echo ""
echo "🔗 测试链接示例:"
echo "   http://localhost:3030/static/pdhtml/$PROJECT_ID/[template_version_id].html" 