#!/bin/bash
# generate-sitemap.sh - ProductMind AI 完整Sitemap生成脚本
# 包含: sitemap.xml, sitemap-zh.xml, sitemap-en.xml, sitemap-index.xml

echo "🚀 ProductMind AI 完整Sitemap生成脚本"
echo "开始时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

# 获取脚本所在目录和项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "📁 项目根目录: $PROJECT_ROOT"
echo "📁 脚本目录: $SCRIPT_DIR"

# 切换到项目根目录
cd "$PROJECT_ROOT" || {
    echo "❌ 无法切换到项目根目录: $PROJECT_ROOT"
    exit 1
}

# 创建日志目录
mkdir -p logs

# 设置日志文件
LOG_FILE="logs/sitemap-generation-$(date +%Y%m%d_%H%M%S).log"
exec 1> >(tee -a "$LOG_FILE")
exec 2>&1

echo "📝 日志文件: $LOG_FILE"

# 1. 环境检查
echo -e "\n1️⃣ 环境检查..."

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装或不在PATH中"
    exit 1
fi
echo "✅ Node.js版本: $(node --version)"

# 检查环境变量文件
if [ ! -f "aws-backend/.env" ]; then
    echo "❌ 环境变量文件不存在: aws-backend/.env"
    exit 1
fi
echo "✅ 环境变量文件存在"

# 检查SSH密钥
SSH_KEY="/Users/a1/work/productmindai.pem"
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH密钥文件不存在: $SSH_KEY"
    exit 1
fi
echo "✅ SSH密钥文件存在"

# 2. 生成完整sitemap
echo -e "\n2️⃣ 生成完整sitemap体系..."

# 运行生成脚本
node "$SCRIPT_DIR/generate-complete-sitemap.cjs"
GENERATE_EXIT_CODE=$?

if [ $GENERATE_EXIT_CODE -eq 0 ]; then
    echo "✅ sitemap生成成功"
else
    echo "❌ sitemap生成失败，退出码: $GENERATE_EXIT_CODE"
    exit $GENERATE_EXIT_CODE
fi

# 3. 上传所有sitemap文件到服务器
echo -e "\n3️⃣ 上传sitemap文件到服务器..."

REMOTE_HOST="ec2-user@3.93.149.236"
REMOTE_PATH="/home/productmindaidev/public"

# 上传文件列表
SITEMAP_FILES=(
    "sitemap.xml"
    "sitemap-zh.xml" 
    "sitemap-en.xml"
    "sitemap-index.xml"
    "sitemap-images.xml"
)

for file in "${SITEMAP_FILES[@]}"; do
    if [ -f "public/$file" ]; then
        echo "📤 上传 $file..."
        scp -i "$SSH_KEY" "public/$file" "$REMOTE_HOST:$REMOTE_PATH/"
        if [ $? -eq 0 ]; then
            echo "✅ $file 上传成功"
        else
            echo "❌ $file 上传失败"
        fi
    else
        echo "⚠️  文件不存在: public/$file"
    fi
done

# 4. 验证远程访问
echo -e "\n4️⃣ 验证远程访问..."

sleep 3  # 等待文件生效

# 验证URL列表
VERIFY_URLS=(
    "https://productmindai.com/sitemap.xml"
    "https://productmindai.com/sitemap-zh.xml"
    "https://productmindai.com/sitemap-en.xml" 
    "https://productmindai.com/sitemap-index.xml"
    "https://productmindai.com/sitemap-images.xml"
)

for url in "${VERIFY_URLS[@]}"; do
    echo "🔍 验证 $url..."
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    if [ "$status" = "200" ]; then
        # 获取URL数量
        url_count=$(curl -s "$url" | grep -c "<url>" || echo "N/A")
        echo "✅ $url 访问正常 (HTTP $status, URLs: $url_count)"
    else
        echo "❌ $url 访问失败 (HTTP $status)"
    fi
done

# 5. 生成统计报告
echo -e "\n5️⃣ 生成统计报告..."

REPORT_FILE="logs/sitemap-report-$(date +%Y%m%d_%H%M%S).md"
cat > "$REPORT_FILE" << REPORT
# ProductMind AI Sitemap生成报告

## 执行信息
- **执行时间**: $(date '+%Y-%m-%d %H:%M:%S')
- **执行用户**: $(whoami)
- **项目目录**: $PROJECT_ROOT
- **日志文件**: $LOG_FILE

## 生成的Sitemap文件

### 1. 主要Sitemap
- **sitemap.xml**: 主sitemap文件
- **sitemap-zh.xml**: 中文页面sitemap
- **sitemap-en.xml**: 英文页面sitemap
- **sitemap-index.xml**: sitemap索引文件
- **sitemap-images.xml**: 图片sitemap

### 2. 文件统计
REPORT

# 添加文件统计
for file in "${SITEMAP_FILES[@]}"; do
    if [ -f "public/$file" ]; then
        size=$(du -h "public/$file" | cut -f1)
        urls=$(grep -c "<url>" "public/$file" 2>/dev/null || echo "N/A")
        echo "- **$file**: $size, $urls URLs" >> "$REPORT_FILE"
    fi
done

cat >> "$REPORT_FILE" << REPORT

### 3. 访问地址
- 主sitemap: https://productmindai.com/sitemap.xml
- 中文sitemap: https://productmindai.com/sitemap-zh.xml
- 英文sitemap: https://productmindai.com/sitemap-en.xml
- sitemap索引: https://productmindai.com/sitemap-index.xml
- 图片sitemap: https://productmindai.com/sitemap-images.xml

### 4. Google Search Console提交
建议按以下顺序提交sitemap:
1. sitemap-index.xml (主索引)
2. sitemap.xml (主文件)
3. sitemap-zh.xml (中文)
4. sitemap-en.xml (英文)
5. sitemap-images.xml (图片)

### 5. 下一步操作
1. 在Google Search Console提交所有sitemap
2. 监控收录状态和错误报告
3. 定期检查sitemap访问性
4. 根据内容更新重新生成

---
*报告生成时间: $(date '+%Y-%m-%d %H:%M:%S')*
REPORT

echo "📊 统计报告已保存: $REPORT_FILE"

# 6. 完成总结
echo -e "\n🎉 完整Sitemap生成完成！"
echo "=========================================="
echo "📊 生成的文件:"
for file in "${SITEMAP_FILES[@]}"; do
    if [ -f "public/$file" ]; then
        size=$(du -h "public/$file" | cut -f1)
        echo "   ✅ $file ($size)"
    else
        echo "   ❌ $file (未生成)"
    fi
done

echo ""
echo "🔗 访问地址:"
echo "   - 主sitemap: https://productmindai.com/sitemap.xml"
echo "   - 中文sitemap: https://productmindai.com/sitemap-zh.xml"
echo "   - 英文sitemap: https://productmindai.com/sitemap-en.xml"
echo "   - sitemap索引: https://productmindai.com/sitemap-index.xml"
echo ""
echo "📋 Google Search Console提交顺序:"
echo "   1. sitemap-index.xml (主索引)"
echo "   2. sitemap.xml (主文件)"
echo "   3. sitemap-zh.xml (中文)"
echo "   4. sitemap-en.xml (英文)"
echo "   5. sitemap-images.xml (图片)"
echo ""
echo "✅ 脚本执行完成！"

exit 0
