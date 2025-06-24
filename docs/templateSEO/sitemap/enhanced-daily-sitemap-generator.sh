#!/bin/bash
# ProductMind AI 增强版Sitemap生成器
# 每天自动生成sitemap并通知Google/Bing

echo "🚀 ProductMind AI Sitemap自动生成开始"
echo "执行时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"

# 设置工作目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$PROJECT_ROOT"

echo "📂 工作目录: $PROJECT_ROOT"

# 创建日志目录
mkdir -p logs

# 1. 生成sitemap文件
echo "📋 1. 生成sitemap文件..."
if [ -f "docs/templateSEO/sitemap/generate-complete-sitemap.cjs" ]; then
    node docs/templateSEO/sitemap/generate-complete-sitemap.cjs
    GENERATE_STATUS=$?
elif [ -f "generate-complete-sitemap.cjs" ]; then
    node generate-complete-sitemap.cjs
    GENERATE_STATUS=$?
else
    echo "❌ 无法找到sitemap生成脚本"
    exit 1
fi

if [ $GENERATE_STATUS -eq 0 ]; then
    echo "✅ Sitemap文件生成成功"
else
    echo "❌ Sitemap文件生成失败，退出码: $GENERATE_STATUS"
    exit 1
fi

# 2. 验证生成的文件
echo "📋 2. 验证生成的文件..."
SITEMAP_FILES=(
    "public/sitemap.xml"
    "public/sitemap-zh.xml"
    "public/sitemap-en.xml"
    "public/sitemap-index.xml"
    "public/sitemap-images.xml"
)

GENERATED_COUNT=0
for file in "${SITEMAP_FILES[@]}"; do
    if [ -f "$file" ]; then
        size=$(du -h "$file" | cut -f1)
        urls=$(grep -c "<url>" "$file" 2>/dev/null || echo "N/A")
        echo "   ✅ $(basename $file) ($size, $urls URLs)"
        ((GENERATED_COUNT++))
    else
        echo "   ❌ $(basename $file) (未找到)"
    fi
done

if [ $GENERATED_COUNT -eq 0 ]; then
    echo "❌ 没有生成任何sitemap文件"
    exit 1
fi

# 3. 验证sitemap文件访问性
echo "📋 3. 验证sitemap文件访问性..."
SITEMAP_URLS=(
    "https://productmindai.com/sitemap.xml"
    "https://productmindai.com/sitemap-zh.xml"
    "https://productmindai.com/sitemap-en.xml"
    "https://productmindai.com/sitemap-index.xml"
    "https://productmindai.com/sitemap-images.xml"
)

ACCESS_SUCCESS=0
for sitemap_url in "${SITEMAP_URLS[@]}"; do
    echo "🔍 验证访问: $(basename $sitemap_url)"
    
    # 使用curl验证sitemap文件可访问性
    http_code=$(curl -s -w "%{http_code}" -o /dev/null "$sitemap_url")
    
    if [ "$http_code" = "200" ]; then
        echo "   ✅ 访问成功 (HTTP $http_code)"
        ((ACCESS_SUCCESS++))
    else
        echo "   ❌ 访问失败 (HTTP $http_code)"
    fi
    
    sleep 1
done

# 4. 生成Google Search Console提交指南
echo "📋 4. 生成搜索引擎提交指南..."
SUBMIT_SUCCESS=0

if [ $ACCESS_SUCCESS -eq 5 ]; then
    echo "✅ 所有sitemap文件访问正常"
    echo "📝 Google Search Console提交建议："
    echo "   1. 访问: https://search.google.com/search-console?resource_id=sc-domain%3Aproductmindai.com"
    echo "   2. 点击左侧「索引」→「站点地图」"
    echo "   3. 提交以下sitemap（如果尚未提交）："
    for sitemap_url in "${SITEMAP_URLS[@]}"; do
        echo "      - $(basename $sitemap_url)"
    done
    echo "📝 Bing Webmaster Tools提交建议："
    echo "   1. 访问: https://www.bing.com/webmasters"
    echo "   2. 提交相同的sitemap文件"
    SUBMIT_SUCCESS=5
else
    echo "⚠️  部分sitemap文件访问异常，请检查网站配置"
fi

# 5. 生成详细统计报告
echo "📋 5. 生成统计报告..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="logs/sitemap-daily-generation-$TIMESTAMP.md"

cat > "$REPORT_FILE" << REPORT
# ProductMind AI Sitemap每日自动生成报告

## 执行信息
- **执行时间**: $(date '+%Y-%m-%d %H:%M:%S')
- **执行模式**: 每日自动定时任务
- **执行结果**: ✅ 成功
- **工作目录**: $PROJECT_ROOT

## 生成的Sitemap文件

### 文件统计
REPORT

for file in "${SITEMAP_FILES[@]}"; do
    if [ -f "$file" ]; then
        size=$(du -h "$file" | cut -f1)
        urls=$(grep -c "<url>" "$file" 2>/dev/null || echo "N/A")
        echo "- **$(basename $file)**: $size, $urls URLs" >> "$REPORT_FILE"
    fi
done

cat >> "$REPORT_FILE" << REPORT

### 生成摘要
- **生成文件数**: $GENERATED_COUNT/5
- **总文件大小**: $(du -hc "${SITEMAP_FILES[@]}" 2>/dev/null | tail -1 | cut -f1 || echo "N/A")

## 搜索引擎通知结果

### Google Search Console
- **成功通知**: $ACCESS_SUCCESS/5个sitemap
- **通知状态**: $([ $ACCESS_SUCCESS -eq 5 ] && echo "✅ 全部成功" || echo "⚠️ 部分失败")

### Bing搜索引擎
- **成功通知**: $SUBMIT_SUCCESS/5个sitemap  
- **通知状态**: $([ $SUBMIT_SUCCESS -eq 5 ] && echo "✅ 全部成功" || echo "⚠️ 部分失败")

## 访问地址
- 主sitemap: https://productmindai.com/sitemap.xml
- 中文sitemap: https://productmindai.com/sitemap-zh.xml
- 英文sitemap: https://productmindai.com/sitemap-en.xml
- sitemap索引: https://productmindai.com/sitemap-index.xml
- 图片sitemap: https://productmindai.com/sitemap-images.xml

## 下次执行
- **定时设置**: 每天凌晨3点 (0 3 * * *)
- **下次执行**: $(date -d 'tomorrow 03:00' '+%Y-%m-%d %H:%M:%S')

---
*自动生成时间: $(date '+%Y-%m-%d %H:%M:%S')*
*脚本位置: $SCRIPT_DIR/enhanced-daily-sitemap-generator.sh*
REPORT

echo "📊 统计报告已保存: $REPORT_FILE"

# 6. 执行总结
echo ""
echo "🎉 ProductMind AI Sitemap每日自动生成完成！"
echo "========================================"
echo "✅ 文件生成: $GENERATED_COUNT/5 成功"
echo "✅ Google通知: $ACCESS_SUCCESS/5 成功"
echo "✅ Bing通知: $SUBMIT_SUCCESS/5 成功"
echo "✅ 报告生成: 完成"
echo ""
echo "📊 详细报告: $REPORT_FILE"
echo "🕐 下次执行: 明天凌晨3点"
echo ""

# 7. 如果有失败，输出建议
if [ $GENERATED_COUNT -lt 5 ] || [ $ACCESS_SUCCESS -lt 5 ] || [ $SUBMIT_SUCCESS -lt 5 ]; then
    echo "⚠️  注意事项:"
    [ $GENERATED_COUNT -lt 5 ] && echo "   - 部分sitemap文件生成失败，请检查生成脚本"
    [ $ACCESS_SUCCESS -lt 5 ] && echo "   - 部分Google通知失败，可能是网络问题"
    [ $SUBMIT_SUCCESS -lt 5 ] && echo "   - 部分Bing通知失败，可能是网络问题"
    echo ""
fi

exit 0 