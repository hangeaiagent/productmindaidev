#!/bin/bash

# 模板详情生成器链接修复脚本
# 用于修复模板详情页面中的导航链接问题

echo "🔧 开始修复模板详情生成器链接..."

# 定义文件路径
GENERATOR_FILE="aws-backend/enhanced-template-generator.mjs"

if [ ! -f "$GENERATOR_FILE" ]; then
    echo "❌ 找不到文件: $GENERATOR_FILE"
    exit 1
fi

echo "📁 找到文件: $GENERATOR_FILE"

# 备份原文件
cp "$GENERATOR_FILE" "$GENERATOR_FILE.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ 已备份原文件"

# 修改1: 将面包屑导航中的"项目库"改为"AI产品中心"
echo "🔧 修改1: 更新面包屑导航..."
sed -i 's|项目库|AI产品中心|g' "$GENERATOR_FILE"

# 修改2: 更新导航栏中间的高亮文本
echo "🔧 修改2: 更新导航栏高亮文本..."
sed -i 's|项目库|AI产品中心|g' "$GENERATOR_FILE"

# 修改3: 修复语言切换功能，使其使用正确的文件名格式
echo "🔧 修改3: 修复语言切换功能..."
sed -i 's|-en\.html|en.html|g' "$GENERATOR_FILE"

echo "✅ 修改完成！"

# 验证修改
echo "📋 验证修改结果..."
if grep -q "AI产品中心" "$GENERATOR_FILE"; then
    echo "✅ 导航文本已更新为'AI产品中心'"
else
    echo "❌ 导航文本更新失败"
fi

echo ""
echo "📊 修复完成！请重新运行模板详情生成器以应用修改。"
echo "执行命令: node aws-backend/enhanced-template-generator.mjs" 