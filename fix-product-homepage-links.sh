#!/bin/bash

# 产品主页链接修复脚本
# 用于修复产品主页中的导航链接问题

echo "🔧 开始修复产品主页链接..."

# 定义文件路径
GENERATOR_FILE="generate-seo-pages.cjs"

if [ ! -f "$GENERATOR_FILE" ]; then
    echo "❌ 找不到文件: $GENERATOR_FILE"
    exit 1
fi

echo "📁 找到文件: $GENERATOR_FILE"

# 备份原文件
cp "$GENERATOR_FILE" "$GENERATOR_FILE.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ 已备份原文件"

# 修改1: 删除导航栏中的多余链接
echo "🔧 修改1: 删除导航栏中的多余链接..."
sed -i 's|<a href="${PUBLIC_BASE_URL}/ai-products" class="nav-btn secondary">|<!-- 删除多余链接 -->|g' "$GENERATOR_FILE"
sed -i 's|<span class="btn-icon">📁</span>|<!-- 删除多余链接 -->|g' "$GENERATOR_FILE"
sed -i 's|<span class="btn-text">项目库</span>|<!-- 删除多余链接 -->|g' "$GENERATOR_FILE"
sed -i 's|<a href="${PUBLIC_BASE_URL}/login" class="nav-btn secondary">|<!-- 删除多余链接 -->|g' "$GENERATOR_FILE"
sed -i 's|<span class="btn-icon">👤</span>|<!-- 删除多余链接 -->|g' "$GENERATOR_FILE"
sed -i 's|<span class="btn-text">登录</span>|<!-- 删除多余链接 -->|g' "$GENERATOR_FILE"
sed -i 's|<a href="${PUBLIC_BASE_URL}/register" class="nav-btn primary">|<!-- 删除多余链接 -->|g' "$GENERATOR_FILE"
sed -i 's|<span class="btn-icon">✨</span>|<!-- 删除多余链接 -->|g' "$GENERATOR_FILE"
sed -i 's|<span class="btn-text">注册</span>|<!-- 删除多余链接 -->|g' "$GENERATOR_FILE"

# 修改2: 将面包屑导航中的"项目库"改为"AI产品中心"
echo "🔧 修改1: 更新面包屑导航..."
sed -i 's|项目库</a>|AI产品中心</a>|g' "$GENERATOR_FILE"

# 修改3: 删除页脚中的产品相关链接
echo "🔧 修改2: 删除页脚中的产品相关链接..."
sed -i '/模板库/d' "$GENERATOR_FILE"
sed -i '/AI工具/d' "$GENERATOR_FILE"
sed -i '/价格方案/d' "$GENERATOR_FILE"
sed -i 's|<h4>产品<\/h4>/,<\/ul>/d' "$GENERATOR_FILE"

echo "✅ 修改完成！"

# 验证修改
echo "📋 验证修改结果..."
if grep -q "AI产品中心" "$GENERATOR_FILE"; then
    echo "✅ 面包屑导航已更新为'AI产品中心'"
else
    echo "❌ 面包屑导航更新失败"
fi

if ! grep -q "模板库" "$GENERATOR_FILE"; then
    echo "✅ 页脚产品链接已删除"
else
    echo "❌ 页脚产品链接删除失败"
fi

echo ""
echo "📊 修复完成！请重新生成产品主页以应用修改。"
echo "执行命令: node generate-seo-pages.cjs [项目ID]" 