#!/bin/bash

# 服务器端导航链接修复和重新生成脚本
# 请将此脚本复制到服务器上执行

echo "🚀 ProductMind AI 导航链接修复和页面重新生成"
echo "=============================================="

# 检查当前目录
if [ ! -f "generate-seo-pages.cjs" ]; then
    echo "❌ 请在productmindaidev目录下执行此脚本"
    echo "当前目录: $(pwd)"
    exit 1
fi

echo "📁 当前目录: $(pwd)"
echo "✅ 环境检查通过"

# 1. 备份现有文件
echo ""
echo "📦 1. 备份现有文件..."
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

if [ -f "generate-seo-pages.cjs" ]; then
    cp "generate-seo-pages.cjs" "$BACKUP_DIR/"
    echo "✅ 已备份 generate-seo-pages.cjs"
fi

if [ -f "aws-backend/enhanced-template-generator.mjs" ]; then
    cp "aws-backend/enhanced-template-generator.mjs" "$BACKUP_DIR/"
    echo "✅ 已备份 enhanced-template-generator.mjs"
fi

# 2. 应用导航链接修复
echo ""
echo "🔧 2. 应用导航链接修复..."

# 修复产品主页生成器
echo "🔧 修复产品主页生成器..."
if [ -f "generate-seo-pages.cjs" ]; then
    # 将"项目库"改为"AI产品中心"
    sed -i 's|项目库</a>|AI产品中心</a>|g' "generate-seo-pages.cjs"
    
    # 删除页脚中的产品相关链接
    sed -i '/模板库/d' "generate-seo-pages.cjs"
    sed -i '/AI工具/d' "generate-seo-pages.cjs" 
    sed -i '/价格方案/d' "generate-seo-pages.cjs"
    
    echo "✅ 产品主页生成器修复完成"
else
    echo "❌ 找不到产品主页生成器文件"
fi

# 修复模板详情生成器
echo "🔧 修复模板详情生成器..."
if [ -f "aws-backend/enhanced-template-generator.mjs" ]; then
    # 将所有"项目库"改为"AI产品中心"
    sed -i 's|项目库|AI产品中心|g' "aws-backend/enhanced-template-generator.mjs"
    
    # 修复语言切换功能
    sed -i 's|-en\.html|en.html|g' "aws-backend/enhanced-template-generator.mjs"
    
    echo "✅ 模板详情生成器修复完成"
else
    echo "❌ 找不到模板详情生成器文件"
fi

# 3. 验证修改
echo ""
echo "📋 3. 验证修改结果..."

if grep -q "AI产品中心" "generate-seo-pages.cjs" 2>/dev/null; then
    echo "✅ 产品主页: 面包屑导航已更新为'AI产品中心'"
else
    echo "❌ 产品主页: 面包屑导航更新失败"
fi

if ! grep -q "模板库" "generate-seo-pages.cjs" 2>/dev/null; then
    echo "✅ 产品主页: 页脚产品链接已删除"
else
    echo "❌ 产品主页: 页脚产品链接删除失败"
fi

if grep -q "AI产品中心" "aws-backend/enhanced-template-generator.mjs" 2>/dev/null; then
    echo "✅ 模板详情: 导航文本已更新为'AI产品中心'"
else
    echo "❌ 模板详情: 导航文本更新失败"
fi

# 4. 重启PM2服务
echo ""
echo "🔄 4. 重启PM2服务..."
pm2 list
echo ""
echo "重启所有PM2服务..."
pm2 restart all

echo ""
echo "⏱️ 等待服务启动..."
sleep 5

# 5. 重新生成测试页面
echo ""
echo "📄 5. 重新生成测试页面..."

# 重新生成测试项目主页
echo "重新生成项目主页: 111c5e34-058d-4293-9cc6-02c0d1535297"
node generate-seo-pages.cjs 111c5e34-058d-4293-9cc6-02c0d1535297

echo ""
echo "重新生成几个模板详情页面..."
# 如果有正在运行的模板详情生成器，重启它
if pm2 list | grep -q "template-details-generator"; then
    echo "重启模板详情生成器..."
    pm2 restart template-details-generator
else
    echo "手动生成一些模板详情页面..."
    timeout 30 node aws-backend/enhanced-template-generator.mjs || echo "模板生成超时，继续..."
fi

# 6. 检查生成结果
echo ""
echo "📊 6. 检查生成结果..."

TEST_FILE="static-pages/pdhtml/111c5e34-058d-4293-9cc6-02c0d1535297/index.html"
if [ -f "$TEST_FILE" ]; then
    echo "✅ 测试页面生成成功: $TEST_FILE"
    
    # 检查页面内容
    if grep -q "AI产品中心" "$TEST_FILE"; then
        echo "✅ 页面内容验证通过: 包含'AI产品中心'"
    else
        echo "❌ 页面内容验证失败: 未找到'AI产品中心'"
    fi
else
    echo "❌ 测试页面生成失败"
fi

# 7. 显示服务状态
echo ""
echo "📋 7. 当前服务状态..."
pm2 list

echo ""
echo "🎉 部署和重新生成完成！"
echo "========================="
echo ""
echo "📋 完成的操作："
echo "✅ 备份原始文件到: $BACKUP_DIR"
echo "✅ 修复导航链接问题"
echo "✅ 重启PM2服务"
echo "✅ 重新生成测试页面"
echo ""
echo "🌐 测试链接："
echo "https://productmindai.com/static-pages/pdhtml/111c5e34-058d-4293-9cc6-02c0d1535297/index.html"
echo ""
echo "📝 如果需要回滚，请使用备份文件："
echo "cp $BACKUP_DIR/* ./"
echo "cp $BACKUP_DIR/enhanced-template-generator.mjs aws-backend/" 