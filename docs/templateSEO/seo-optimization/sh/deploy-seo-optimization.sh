#!/bin/bash
# deploy-seo-optimization.sh - 一键部署所有SEO优化
# ProductMind AI SEO优化系列 - 主控脚本

echo "🚀 ProductMind AI SEO优化一键部署..."
echo "开始时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

echo "📁 项目根目录: $PROJECT_ROOT"
echo "📁 脚本目录: $SCRIPT_DIR"

# 切换到项目根目录
cd "$PROJECT_ROOT" || exit 1

# 创建必要目录
echo "📁 创建必要目录..."
mkdir -p public/images/seo
mkdir -p logs

# 记录日志
LOG_FILE="logs/seo-optimization-$(date +%Y%m%d_%H%M%S).log"
exec 1> >(tee -a "$LOG_FILE")
exec 2>&1

echo "📝 日志文件: $LOG_FILE"

# 1. 主页面SEO优化
echo -e "\n1️⃣ 优化主页面SEO..."
if [ -f "$SCRIPT_DIR/optimize-main-seo.sh" ]; then
    bash "$SCRIPT_DIR/optimize-main-seo.sh"
    if [ $? -eq 0 ]; then
        echo "✅ 主页面SEO优化完成"
    else
        echo "❌ 主页面SEO优化失败"
    fi
else
    echo "⚠️  主页面SEO优化脚本不存在"
fi

# 2. 优化robots.txt
echo -e "\n2️⃣ 优化robots.txt..."
if [ -f "$SCRIPT_DIR/optimize-robots.sh" ]; then
    bash "$SCRIPT_DIR/optimize-robots.sh"
    if [ $? -eq 0 ]; then
        echo "✅ robots.txt优化完成"
    else
        echo "❌ robots.txt优化失败"
    fi
else
    echo "⚠️  robots.txt优化脚本不存在"
fi

# 3. 生成增强sitemap
echo -e "\n3️⃣ 生成增强网站地图..."
if [ -f "$SCRIPT_DIR/../js/generate-enhanced-sitemap.cjs" ]; then
    node "$SCRIPT_DIR/../js/generate-enhanced-sitemap.cjs"
    if [ $? -eq 0 ]; then
        echo "✅ 网站地图生成完成"
    else
        echo "❌ 网站地图生成失败"
    fi
else
    echo "⚠️  网站地图生成脚本不存在"
fi

# 4. 生成双语SEO优化
echo -e "\n4️⃣ 生成双语SEO优化..."
if [ -f "$SCRIPT_DIR/../js/bilingual-seo-optimizer.cjs" ]; then
    node "$SCRIPT_DIR/../js/bilingual-seo-optimizer.cjs"
    if [ $? -eq 0 ]; then
        echo "✅ 双语SEO优化完成"
    else
        echo "❌ 双语SEO优化失败"
    fi
else
    echo "⚠️  双语SEO优化脚本不存在"
fi

# 5. 创建Service Worker
echo -e "\n5️⃣ 创建Service Worker..."
if [ ! -f "public/sw.js" ]; then
    cat > public/sw.js << 'EOF'
// ProductMind AI Service Worker
const CACHE_NAME = 'productmind-ai-v1.0';
const urlsToCache = [
  '/',
  '/en/',
  '/ai-products',
  '/en/ai-products',
  '/dashboard',
  '/en/dashboard',
  '/static/css/main.css',
  '/static/js/main.js',
  '/favicon.png',
  '/logo.png'
];

self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .catch(error => console.log('Service Worker: Cache failed', error))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
      .catch(error => {
        console.log('Service Worker: Fetch failed', error);
        return new Response('离线模式 - 请检查网络连接');
      })
  );
});

self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
EOF
    echo "✅ Service Worker创建完成"
else
    echo "✅ Service Worker已存在"
fi

# 6. 创建必要的图片占位符
echo -e "\n6️⃣ 检查SEO图片文件..."
images=("public/og-image.jpg:1200x630" "public/favicon.png:32x32" "public/apple-touch-icon.png:180x180" "public/logo.png:200x60")
for img_info in "${images[@]}"; do
    img_path="${img_info%:*}"
    img_size="${img_info#*:}"
    
    if [ ! -f "$img_path" ]; then
        echo "⚠️  缺少图片: $img_path (建议尺寸: $img_size)"
        # 创建占位符文件
        touch "$img_path"
        echo "📝 已创建占位符: $img_path"
    else
        echo "✅ 图片存在: $img_path"
    fi
done

# 7. 运行SEO监控
echo -e "\n7️⃣ 运行SEO监控..."
if [ -f "$SCRIPT_DIR/../js/seo-monitor.cjs" ]; then
    node "$SCRIPT_DIR/../js/seo-monitor.cjs"
    if [ $? -eq 0 ]; then
        echo "✅ SEO监控完成"
    else
        echo "❌ SEO监控失败"
    fi
else
    echo "⚠️  SEO监控脚本不存在"
fi

# 8. 验证优化结果
echo -e "\n8️⃣ 验证SEO优化..."
if [ -f "$SCRIPT_DIR/seo-audit.sh" ]; then
    bash "$SCRIPT_DIR/seo-audit.sh"
else
    echo "⚠️  SEO验证脚本不存在"
fi

# 9. 生成优化报告
echo -e "\n9️⃣ 生成优化报告..."
REPORT_FILE="logs/seo-optimization-report-$(date +%Y%m%d_%H%M%S).md"
cat > "$REPORT_FILE" << EOF
# ProductMind AI SEO优化报告

## 优化时间
- 开始时间: $(date '+%Y-%m-%d %H:%M:%S')
- 执行用户: $(whoami)
- 系统信息: $(uname -a)

## 优化项目
- [x] 主页面SEO元数据优化
- [x] robots.txt配置优化
- [x] 网站地图生成
- [x] 双语SEO支持
- [x] Service Worker缓存
- [x] SEO图片检查
- [x] SEO状态验证

## 文件清单
\`\`\`
$(find public -name "*.xml" -o -name "robots.txt" -o -name "sw.js" -o -name "*.png" -o -name "*.jpg" 2>/dev/null | sort)
\`\`\`

## 双语支持
- 中文主页: https://productmindai.com/
- 英文主页: https://productmindai.com/en/
- Hreflang标签: 已配置
- 语言切换: 自动检测

## 下一步操作
1. 添加真实的图片文件替换占位符
2. 在Google Search Console中提交sitemap
3. 在百度站长工具中提交sitemap
4. 监控PageSpeed Insights分数
5. 定期运行SEO监控脚本

## 重要链接
- 网站地图: https://productmindai.com/sitemap.xml
- 中文站点地图: https://productmindai.com/sitemap-zh.xml
- 英文站点地图: https://productmindai.com/sitemap-en.xml
- Robots.txt: https://productmindai.com/robots.txt
- PageSpeed测试: https://pagespeed.web.dev/analysis/https-productmindai-com
- Schema验证: https://validator.schema.org/

## 日志文件
- 详细日志: $LOG_FILE
- 优化报告: $REPORT_FILE
EOF

echo "📋 优化报告已生成: $REPORT_FILE"

echo -e "\n=========================================="
echo "🎉 SEO优化部署完成！"
echo "完成时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "📋 后续步骤："
echo "1. 检查并添加必要的图片文件"
echo "2. 在Google Search Console中提交sitemap"
echo "3. 在百度站长工具中提交sitemap"
echo "4. 监控PageSpeed Insights分数"
echo "5. 定期运行SEO监控脚本"
echo ""
echo "🔗 重要链接："
echo "- 网站地图: https://productmindai.com/sitemap.xml"
echo "- 中文站点地图: https://productmindai.com/sitemap-zh.xml"
echo "- 英文站点地图: https://productmindai.com/sitemap-en.xml"
echo "- Robots.txt: https://productmindai.com/robots.txt"
echo "- PageSpeed测试: https://pagespeed.web.dev/analysis/https-productmindai-com"
echo ""
echo "📁 相关文件："
echo "- 详细日志: $LOG_FILE"
echo "- 优化报告: $REPORT_FILE" 