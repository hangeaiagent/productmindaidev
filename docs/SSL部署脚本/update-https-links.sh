#!/bin/bash

# 更新ProductMind AI产品主页中的HTTPS链接脚本

echo "🔗 开始更新产品主页HTTPS链接..."

# 1. 更新产品主页生成器中的链接
echo "📝 更新generate-seo-pages.cjs中的链接..."
sed -i 's|http://productmindai.com|https://productmindai.com|g' generate-seo-pages.cjs

# 2. 批量更新所有已生成的产品主页
echo "🔄 批量更新已生成的产品主页..."
if [ -d "static-pages/pdhtml" ]; then
    find static-pages/pdhtml -name "index.html" -type f -exec sed -i 's|http://productmindai.com|https://productmindai.com|g' {} \;
    echo "✅ 已更新所有产品主页中的链接"
else
    echo "⚠️  static-pages/pdhtml目录不存在"
fi

# 3. 重新生成产品主页
read -p "是否重新生成所有产品主页？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔄 重新生成所有产品主页..."
    export VITE_SUPABASE_URL="https://uobwbhvwrciaxloqdizc.supabase.co"
    export VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvYndiaHZ3cmNpYXhsb3FkaXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNzEyNjYsImV4cCI6MjA2MjY0NzI2Nn0.x9Tti06ZF90B2YPg-AeVvT_tf4qOcOYcHWle6L3OVtc"
    node generate-seo-pages.cjs
    echo "✅ 产品主页重新生成完成"
fi

echo "�� HTTPS链接更新完成！"
echo ""
echo "📋 更新内容："
echo "• generate-seo-pages.cjs 中的链接已更新为HTTPS"
echo "• 所有已生成的产品主页链接已更新为HTTPS"
echo ""
echo "🧪 测试链接："
echo "https://productmindai.com"
echo "https://productmindai.com/ai-products" 