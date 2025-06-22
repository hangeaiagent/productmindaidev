#!/bin/bash

# 全面的导航链接修复脚本
# 确保所有代码生成工具都同步修改，避免下次重新生成时出现错误

echo "🚀 ProductMind AI 全面导航链接修复"
echo "===================================="
echo "📋 本脚本将修复所有相关的代码生成工具"
echo ""

# 备份目录
BACKUP_DIR="backup_navigation_fix_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "📦 创建备份目录: $BACKUP_DIR"

# 需要修复的文件列表
declare -a FILES_TO_FIX=(
    "generate-seo-pages.cjs"
    "aws-backend/enhanced-template-generator.mjs"
    "ai-product-demo-generator.cjs"
    "generate-ai-product-demo.cjs"
    "smart-product-demo-generator.cjs"
    "batch-stream-generator.cjs"
)

echo ""
echo "📋 需要修复的文件列表："
for file in "${FILES_TO_FIX[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (文件不存在)"
    fi
done

echo ""
echo "🔧 开始执行修复..."

# 1. 备份所有文件
echo ""
echo "📦 1. 备份现有文件..."
for file in "${FILES_TO_FIX[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "$BACKUP_DIR/"
        echo "✅ 已备份: $file"
    fi
done

# 2. 修复产品主页生成器
echo ""
echo "🔧 2. 修复产品主页生成器..."
if [ -f "generate-seo-pages.cjs" ]; then
    sed -i 's|项目库</a>|AI产品中心</a>|g' "generate-seo-pages.cjs"
    sed -i '/模板库/d' "generate-seo-pages.cjs"
    sed -i '/AI工具/d' "generate-seo-pages.cjs"
    sed -i '/价格方案/d' "generate-seo-pages.cjs"
    echo "✅ generate-seo-pages.cjs 修复完成"
else
    echo "❌ generate-seo-pages.cjs 文件不存在"
fi

# 3. 修复模板详情生成器
echo ""
echo "🔧 3. 修复模板详情生成器..."
if [ -f "aws-backend/enhanced-template-generator.mjs" ]; then
    sed -i 's|项目库|AI产品中心|g' "aws-backend/enhanced-template-generator.mjs"
    sed -i 's|-en\\.html|en.html|g' "aws-backend/enhanced-template-generator.mjs"
    echo "✅ enhanced-template-generator.mjs 修复完成"
else
    echo "❌ enhanced-template-generator.mjs 文件不存在"
fi

# 4. 修复其他生成器
echo ""
echo "🔧 4. 修复其他生成器..."
for demo_file in "ai-product-demo-generator.cjs" "generate-ai-product-demo.cjs" "smart-product-demo-generator.cjs" "batch-stream-generator.cjs"; do
    if [ -f "$demo_file" ]; then
        if grep -q "项目库\\|模板库" "$demo_file"; then
            sed -i 's|项目库|AI产品中心|g' "$demo_file"
            sed -i '/模板库/d' "$demo_file"
            echo "✅ $demo_file 修复完成"
        else
            echo "ℹ️  $demo_file 无需修复"
        fi
    else
        echo "❌ $demo_file 文件不存在"
    fi
done

echo ""
echo "📋 验证修改结果..."
for file in "${FILES_TO_FIX[@]}"; do
    if [ -f "$file" ]; then
        echo "📄 $file:"
        if grep -q "AI产品中心" "$file"; then
            echo "  ✅ 包含'AI产品中心'"
        fi
        if grep -q "项目库\\|模板库" "$file"; then
            echo "  ⚠️  仍包含旧链接"
        else
            echo "  ✅ 已清理旧链接"
        fi
    fi
done

echo ""
echo "🎉 全面修复完成！"
echo "�� 下一步: 重新生成页面测试修复效果" 