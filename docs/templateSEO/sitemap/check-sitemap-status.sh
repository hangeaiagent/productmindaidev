#!/bin/bash
# check-sitemap-status.sh - 快速检查sitemap状态

echo "🔍 ProductMind AI Sitemap状态检查"
echo "检查时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=================================="

# 检查本地文件
echo "📄 本地Sitemap文件:"
files=("sitemap.xml" "sitemap-zh.xml" "sitemap-en.xml" "sitemap-index.xml" "sitemap-images.xml")
for file in "${files[@]}"; do
    if [ -f "public/$file" ]; then
        size=$(du -h "public/$file" | cut -f1)
        urls=$(grep -c "<url>\|<sitemap>" "public/$file" 2>/dev/null)
        modified=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "public/$file" 2>/dev/null || date -r "public/$file" "+%Y-%m-%d %H:%M" 2>/dev/null)
        echo "✅ $file ($size, $urls 条目, 修改: $modified)"
    else
        echo "❌ $file 不存在"
    fi
done

# 检查远程访问
echo -e "\n🌐 远程访问状态:"
urls=("sitemap.xml" "sitemap-zh.xml" "sitemap-en.xml" "sitemap-index.xml" "sitemap-images.xml")
for file in "${urls[@]}"; do
    status=$(curl -s -o /dev/null -w "%{http_code}" "https://productmindai.com/$file")
    if [ "$status" = "200" ]; then
        remote_urls=$(curl -s "https://productmindai.com/$file" | grep -c "<url>\|<sitemap>" 2>/dev/null)
        echo "✅ $file (HTTP $status, $remote_urls 条目)"
    else
        echo "❌ $file (HTTP $status)"
    fi
done

# 检查最近的生成日志
echo -e "\n📝 最近的生成记录:"
if [ -f "logs/sitemap-cron.log" ]; then
    echo "最近5条cron日志:"
    tail -5 logs/sitemap-cron.log
else
    echo "未找到cron日志文件"
fi

# 检查最新的报告
echo -e "\n📊 最新执行报告:"
latest_report=$(ls -t logs/sitemap-report-*.md 2>/dev/null | head -1)
if [ -n "$latest_report" ]; then
    echo "报告文件: $latest_report"
    echo "生成时间: $(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$latest_report" 2>/dev/null || date -r "$latest_report" "+%Y-%m-%d %H:%M" 2>/dev/null)"
else
    echo "未找到执行报告"
fi

echo -e "\n✅ 状态检查完成"
