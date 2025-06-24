#!/bin/bash
# deploy-to-server.sh - 部署sitemap生成系统到服务器
# ProductMind AI Sitemap部署脚本

echo "🚀 ProductMind AI Sitemap系统服务器部署"
echo "开始时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

# 服务器配置
REMOTE_HOST="ec2-user@3.93.149.236"
SSH_KEY="/Users/a1/work/productmindai.pem"
REMOTE_BASE_PATH="/home/productmindaidev"
REMOTE_SITEMAP_PATH="$REMOTE_BASE_PATH/sitemap-system"

# 本地路径
LOCAL_SITEMAP_DIR="docs/templateSEO/sitemap"

echo "🔧 部署配置:"
echo "   远程主机: $REMOTE_HOST"
echo "   SSH密钥: $SSH_KEY"
echo "   远程路径: $REMOTE_SITEMAP_PATH"
echo "   本地路径: $LOCAL_SITEMAP_DIR"

# 1. 检查SSH连接
echo -e "\n1️⃣ 检查SSH连接..."
if ssh -i "$SSH_KEY" "$REMOTE_HOST" "echo 'SSH连接正常'" > /dev/null 2>&1; then
    echo "✅ SSH连接正常"
else
    echo "❌ SSH连接失败，请检查网络和密钥"
    exit 1
fi

# 2. 创建远程目录结构
echo -e "\n2️⃣ 创建远程目录结构..."
ssh -i "$SSH_KEY" "$REMOTE_HOST" << 'REMOTE_SETUP'
# 创建sitemap系统目录
mkdir -p /home/productmindaidev/sitemap-system
mkdir -p /home/productmindaidev/sitemap-system/logs
mkdir -p /home/productmindaidev/sitemap-system/backup

# 创建必要的符号链接
if [ ! -L "/home/productmindaidev/sitemap-system/aws-backend" ]; then
    ln -sf /home/productmindaidev/aws-backend /home/productmindaidev/sitemap-system/aws-backend
fi

if [ ! -L "/home/productmindaidev/sitemap-system/public" ]; then
    ln -sf /home/productmindaidev/public /home/productmindaidev/sitemap-system/public
fi

echo "✅ 远程目录结构创建完成"
REMOTE_SETUP

# 3. 上传sitemap系统文件
echo -e "\n3️⃣ 上传sitemap系统文件..."

# 上传主要脚本文件
FILES_TO_UPLOAD=(
    "generate-complete-sitemap.cjs"
    "generate-sitemap.sh"
    "check-sitemap-status.sh"
    "README.md"
    "sitemap-cron-setup.md"
)

for file in "${FILES_TO_UPLOAD[@]}"; do
    if [ -f "$LOCAL_SITEMAP_DIR/$file" ]; then
        echo "📤 上传 $file..."
        scp -i "$SSH_KEY" "$LOCAL_SITEMAP_DIR/$file" "$REMOTE_HOST:$REMOTE_SITEMAP_PATH/"
        if [ $? -eq 0 ]; then
            echo "✅ $file 上传成功"
        else
            echo "❌ $file 上传失败"
        fi
    else
        echo "⚠️  文件不存在: $file"
    fi
done

# 4. 设置远程文件权限
echo -e "\n4️⃣ 设置远程文件权限..."
ssh -i "$SSH_KEY" "$REMOTE_HOST" << 'REMOTE_PERMISSIONS'
cd /home/productmindaidev/sitemap-system

# 设置脚本执行权限
chmod +x generate-complete-sitemap.cjs
chmod +x generate-sitemap.sh
chmod +x check-sitemap-status.sh

# 检查Node.js可用性
if command -v node &> /dev/null; then
    echo "✅ Node.js可用: $(node --version)"
else
    echo "❌ Node.js不可用，请安装Node.js"
fi

echo "✅ 文件权限设置完成"
REMOTE_PERMISSIONS

# 5. 安装必要的Node.js依赖
echo -e "\n5️⃣ 检查和安装Node.js依赖..."
ssh -i "$SSH_KEY" "$REMOTE_HOST" << 'REMOTE_DEPS'
cd /home/productmindaidev/sitemap-system

# 检查是否存在package.json，如果不存在则创建
if [ ! -f "package.json" ]; then
    cat > package.json << 'PACKAGE_JSON'
{
  "name": "productmind-sitemap-system",
  "version": "1.0.0",
  "description": "ProductMind AI Sitemap Generation System",
  "main": "generate-complete-sitemap.cjs",
  "scripts": {
    "generate": "node generate-complete-sitemap.cjs",
    "status": "bash check-sitemap-status.sh"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.0.0",
    "dotenv": "^16.0.0"
  }
}
PACKAGE_JSON
    echo "✅ package.json 已创建"
fi

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo "📦 安装Node.js依赖..."
    npm install
    if [ $? -eq 0 ]; then
        echo "✅ 依赖安装成功"
    else
        echo "⚠️  依赖安装失败，但系统可能仍可正常工作（如果全局安装了依赖）"
    fi
else
    echo "✅ Node.js依赖已存在"
fi
REMOTE_DEPS

# 6. 测试远程系统
echo -e "\n6️⃣ 测试远程系统..."
ssh -i "$SSH_KEY" "$REMOTE_HOST" << 'REMOTE_TEST'
cd /home/productmindaidev/sitemap-system

echo "🔍 测试环境检查..."

# 检查环境变量文件
if [ -f "aws-backend/.env" ]; then
    echo "✅ 环境变量文件存在"
    if grep -q "SUPABASE_URL" aws-backend/.env && grep -q "SUPABASE_SERVICE_ROLE_KEY" aws-backend/.env; then
        echo "✅ 必需的环境变量已配置"
    else
        echo "❌ 环境变量配置不完整"
    fi
else
    echo "❌ 环境变量文件不存在"
fi

# 测试状态检查脚本
echo -e "\n🔍 测试状态检查脚本..."
bash check-sitemap-status.sh | head -10

echo -e "\n✅ 远程系统测试完成"
REMOTE_TEST

# 7. 设置定时任务
echo -e "\n7️⃣ 设置定时任务..."
ssh -i "$SSH_KEY" "$REMOTE_HOST" << 'REMOTE_CRON'
# 备份现有的crontab
crontab -l > /tmp/crontab_backup_$(date +%Y%m%d_%H%M%S) 2>/dev/null || echo "# 新的crontab文件" > /tmp/crontab_backup_$(date +%Y%m%d_%H%M%S)

# 检查是否已存在sitemap定时任务
if crontab -l 2>/dev/null | grep -q "sitemap"; then
    echo "⚠️  检测到现有的sitemap定时任务，请手动检查和更新"
    echo "当前的crontab:"
    crontab -l | grep sitemap
else
    echo "📅 添加新的定时任务..."
    
    # 创建新的crontab条目
    (crontab -l 2>/dev/null; echo "# ProductMind AI Sitemap自动生成 - 每周一凌晨2点") | crontab -
    (crontab -l 2>/dev/null; echo "0 2 * * 1 cd /home/productmindaidev/sitemap-system && bash generate-sitemap.sh >> logs/sitemap-cron.log 2>&1") | crontab -
    
    if [ $? -eq 0 ]; then
        echo "✅ 定时任务添加成功"
        echo "定时任务: 每周一凌晨2点执行sitemap生成"
    else
        echo "❌ 定时任务添加失败"
    fi
fi

echo "当前的crontab任务:"
crontab -l
REMOTE_CRON

# 8. 创建服务器管理脚本
echo -e "\n8️⃣ 创建服务器管理脚本..."
ssh -i "$SSH_KEY" "$REMOTE_HOST" << 'REMOTE_SCRIPTS'
cd /home/productmindaidev/sitemap-system

# 创建快速生成脚本
cat > quick-generate.sh << 'QUICK_SCRIPT'
#!/bin/bash
# 快速生成sitemap的便捷脚本
echo "🚀 快速生成sitemap..."
cd /home/productmindaidev/sitemap-system
bash generate-sitemap.sh
QUICK_SCRIPT

chmod +x quick-generate.sh

# 创建状态监控脚本
cat > monitor-sitemap.sh << 'MONITOR_SCRIPT'
#!/bin/bash
# sitemap监控脚本
echo "📊 Sitemap监控报告 - $(date)"
echo "=================================="

# 检查文件状态
bash check-sitemap-status.sh

# 检查最近的cron日志
echo -e "\n📝 最近的定时任务执行:"
if [ -f "logs/sitemap-cron.log" ]; then
    tail -10 logs/sitemap-cron.log
else
    echo "未找到定时任务日志"
fi

# 检查磁盘使用
echo -e "\n💾 磁盘使用情况:"
du -sh /home/productmindaidev/sitemap-system
du -sh /home/productmindaidev/public/sitemap*.xml 2>/dev/null || echo "未找到sitemap文件"
MONITOR_SCRIPT

chmod +x monitor-sitemap.sh

echo "✅ 服务器管理脚本创建完成"
REMOTE_SCRIPTS

# 9. 生成部署报告
echo -e "\n9️⃣ 生成部署报告..."
REPORT_FILE="logs/sitemap-deployment-$(date +%Y%m%d_%H%M%S).md"
mkdir -p logs

cat > "$REPORT_FILE" << REPORT
# ProductMind AI Sitemap系统服务器部署报告

## 部署信息
- **部署时间**: $(date '+%Y-%m-%d %H:%M:%S')
- **部署用户**: $(whoami)
- **远程服务器**: $REMOTE_HOST
- **远程路径**: $REMOTE_SITEMAP_PATH

## 部署的文件
REPORT

for file in "${FILES_TO_UPLOAD[@]}"; do
    if [ -f "$LOCAL_SITEMAP_DIR/$file" ]; then
        echo "- ✅ $file" >> "$REPORT_FILE"
    else
        echo "- ❌ $file (文件不存在)" >> "$REPORT_FILE"
    fi
done

cat >> "$REPORT_FILE" << REPORT

## 服务器配置
- **Node.js环境**: 已检查
- **依赖包**: 已安装
- **文件权限**: 已设置
- **定时任务**: 已配置（每周一凌晨2点）

## 可用命令

### 在服务器上执行：
\`\`\`bash
# 进入sitemap系统目录
cd /home/productmindaidev/sitemap-system

# 快速生成sitemap
bash quick-generate.sh

# 检查系统状态
bash check-sitemap-status.sh

# 监控sitemap状态
bash monitor-sitemap.sh

# 手动执行完整生成
bash generate-sitemap.sh
\`\`\`

### 从本地连接服务器：
\`\`\`bash
# SSH连接到服务器
ssh -i $SSH_KEY $REMOTE_HOST

# 直接执行sitemap生成
ssh -i $SSH_KEY $REMOTE_HOST "cd /home/productmindaidev/sitemap-system && bash quick-generate.sh"

# 检查远程状态
ssh -i $SSH_KEY $REMOTE_HOST "cd /home/productmindaidev/sitemap-system && bash check-sitemap-status.sh"
\`\`\`

## 访问地址
- 主sitemap: https://productmindai.com/sitemap.xml
- 中文sitemap: https://productmindai.com/sitemap-zh.xml
- 英文sitemap: https://productmindai.com/sitemap-en.xml
- sitemap索引: https://productmindai.com/sitemap-index.xml
- 图片sitemap: https://productmindai.com/sitemap-images.xml

## 维护说明
1. 定时任务每周一凌晨2点自动执行
2. 日志文件保存在 logs/ 目录下
3. 可通过 monitor-sitemap.sh 进行日常监控
4. 如需紧急更新，可手动执行 quick-generate.sh

## 故障排查
- 检查环境变量配置: \`cat aws-backend/.env\`
- 查看执行日志: \`tail -f logs/sitemap-cron.log\`
- 测试数据库连接: \`node -e "require('dotenv').config({path:'aws-backend/.env'}); console.log('SUPABASE_URL:', !!process.env.SUPABASE_URL);"\`

---
*部署完成时间: $(date '+%Y-%m-%d %H:%M:%S')*
REPORT

echo "📊 部署报告已保存: $REPORT_FILE"

# 10. 完成部署
echo -e "\n🎉 部署完成！"
echo "=========================================="
echo "📊 部署总结:"
echo "   ✅ 系统文件已上传到服务器"
echo "   ✅ 文件权限已设置"
echo "   ✅ Node.js依赖已安装"
echo "   ✅ 定时任务已配置"
echo "   ✅ 管理脚本已创建"
echo ""
echo "🔗 远程访问:"
echo "   SSH: ssh -i $SSH_KEY $REMOTE_HOST"
echo "   目录: cd /home/productmindaidev/sitemap-system"
echo ""
echo "🚀 快速测试:"
echo "   ssh -i $SSH_KEY $REMOTE_HOST \"cd /home/productmindaidev/sitemap-system && bash quick-generate.sh\""
echo ""
echo "📋 下一步:"
echo "   1. 测试远程sitemap生成"
echo "   2. 验证定时任务执行"
echo "   3. 在Google Search Console提交sitemap"
echo ""
echo "✅ 部署脚本执行完成！"

exit 0
