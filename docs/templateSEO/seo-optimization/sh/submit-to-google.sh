#!/bin/bash
# submit-to-google.sh - Google Search Console站点地图提交辅助脚本
# ProductMind AI SEO优化系列

echo "🚀 Google Search Console 站点地图提交助手"
echo "=========================================="

# 网站配置
DOMAIN="productmindai.com"
BASE_URL="https://$DOMAIN"

# 站点地图列表
SITEMAPS=(
    "sitemap-index.xml"
    "sitemap.xml"
    "sitemap-zh.xml"
    "sitemap-en.xml"
    "sitemap-images.xml"
)

echo "🌐 网站域名: $DOMAIN"
echo "🔗 Google Search Console: https://search.google.com/search-console?resource_id=sc-domain%3A$DOMAIN"
echo ""

# 1. 检查所有站点地图的可访问性
echo "1️⃣ 检查站点地图可访问性..."
echo "----------------------------------------"

all_accessible=true
for sitemap in "${SITEMAPS[@]}"; do
    url="$BASE_URL/$sitemap"
    echo "🔍 检查: $sitemap"
    
    # 使用curl检查HTTP状态
    http_code=$(curl -o /dev/null -s -w "%{http_code}" "$url")
    response_time=$(curl -o /dev/null -s -w "%{time_total}" "$url")
    
    if [ "$http_code" = "200" ]; then
        echo "   ✅ 可访问 (HTTP $http_code, ${response_time}s)"
    else
        echo "   ❌ 不可访问 (HTTP $http_code)"
        all_accessible=false
    fi
done

echo ""

if [ "$all_accessible" = false ]; then
    echo "⚠️  警告：部分站点地图无法访问，请先修复这些问题再提交到Google Search Console"
    echo ""
fi

# 2. 显示提交指南
echo "2️⃣ Google Search Console 提交步骤"
echo "----------------------------------------"
echo "请按照以下步骤手动提交站点地图："
echo ""
echo "📋 第1步：访问Google Search Console"
echo "   🔗 链接: https://search.google.com/search-console?resource_id=sc-domain%3A$DOMAIN"
echo ""
echo "📋 第2步：导航到站点地图页面"
echo "   1. 点击左侧菜单中的「索引」"
echo "   2. 点击「站点地图」"
echo ""
echo "📋 第3步：逐个提交以下站点地图"
echo "   请在「添加新的站点地图」输入框中输入以下URL（不包含域名）："
echo ""

# 显示提交列表
counter=1
for sitemap in "${SITEMAPS[@]}"; do
    echo "   $counter. $sitemap"
    ((counter++))
done

echo ""
echo "📋 第4步：验证提交状态"
echo "   - 确保所有站点地图显示「成功」状态"
echo "   - 检查发现的URL数量是否正确"
echo "   - 关注任何错误或警告信息"

# 3. 生成复制粘贴清单
echo ""
echo "3️⃣ 快速复制粘贴清单"
echo "----------------------------------------"
echo "以下是可以直接复制粘贴的站点地图列表："
echo ""
for sitemap in "${SITEMAPS[@]}"; do
    echo "$sitemap"
done

# 4. 预期结果说明
echo ""
echo "4️⃣ 预期提交结果"
echo "----------------------------------------"
echo "✅ sitemap-index.xml: 应显示包含5个子站点地图"
echo "✅ sitemap.xml: 应显示约3,711个URL"
echo "✅ sitemap-zh.xml: 应显示5个中文页面"
echo "✅ sitemap-en.xml: 应显示5个英文页面"
echo "✅ sitemap-images.xml: 应显示网站图片数量"

echo ""
echo "=========================================="
echo "🎯 现在请访问Google Search Console进行提交！"
echo "🔗 https://search.google.com/search-console?resource_id=sc-domain%3Aproductmindai.com"
echo "=========================================="
