#!/bin/bash

# 综合导航链接修复脚本
# 用于修复产品模板页面和产品主页中的导航链接问题

echo "🚀 开始修复所有导航链接..."
echo "==============================="

# 1. 修复产品主页生成器
echo "📄 1. 修复产品主页生成器..."
HOMEPAGE_FILE="generate-seo-pages.cjs"

if [ -f "$HOMEPAGE_FILE" ]; then
    # 备份文件
    cp "$HOMEPAGE_FILE" "$HOMEPAGE_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    
    # 修改面包屑导航
    sed -i 's|项目库</a>|AI产品中心</a>|g' "$HOMEPAGE_FILE"
    
    # 删除页脚产品链接
    sed -i '/模板库/d' "$HOMEPAGE_FILE"
    sed -i '/AI工具/d' "$HOMEPAGE_FILE"
    sed -i '/价格方案/d' "$HOMEPAGE_FILE"
    
    echo "✅ 产品主页生成器修复完成"
else
    echo "❌ 找不到产品主页生成器文件: $HOMEPAGE_FILE"
fi

# 2. 修复模板详情生成器
echo ""
echo "📄 2. 修复模板详情生成器..."
TEMPLATE_FILE="aws-backend/enhanced-template-generator.mjs"

if [ -f "$TEMPLATE_FILE" ]; then
    # 备份文件
    cp "$TEMPLATE_FILE" "$TEMPLATE_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    
    # 修改所有"项目库"为"AI产品中心"
    sed -i 's|项目库|AI产品中心|g' "$TEMPLATE_FILE"
    
    # 修复语言切换功能的文件名格式
    sed -i 's|-en\.html|en.html|g' "$TEMPLATE_FILE"
    
    echo "✅ 模板详情生成器修复完成"
else
    echo "❌ 找不到模板详情生成器文件: $TEMPLATE_FILE"
fi

echo ""
echo "📊 修复完成总结："
echo "=================="

# 验证修改结果
if [ -f "$HOMEPAGE_FILE" ] && grep -q "AI产品中心" "$HOMEPAGE_FILE"; then
    echo "✅ 产品主页: 面包屑导航已更新"
else
    echo "❌ 产品主页: 面包屑导航更新失败"
fi

if [ -f "$HOMEPAGE_FILE" ] && ! grep -q "模板库" "$HOMEPAGE_FILE"; then
    echo "✅ 产品主页: 页脚链接已删除"
else
    echo "❌ 产品主页: 页脚链接删除失败"
fi

if [ -f "$TEMPLATE_FILE" ] && grep -q "AI产品中心" "$TEMPLATE_FILE"; then
    echo "✅ 模板详情: 导航文本已更新"
else
    echo "❌ 模板详情: 导航文本更新失败"
fi

echo ""
echo "🎉 所有修复完成！"
echo ""
echo "📋 下一步操作："
echo "1. 重新生成产品主页: node generate-seo-pages.cjs [项目ID]"
echo "2. 重新生成模板详情: node aws-backend/enhanced-template-generator.mjs"
echo "3. 或者重启相关的PM2服务" 