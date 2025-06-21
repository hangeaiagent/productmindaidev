#!/bin/bash

# 本地执行脚本 - 模板详情页面迁移到static目录
# 上传脚本到远程服务器并执行文件迁移

echo "🚀 ProductMind AI 远程模板迁移部署脚本"
echo "========================================"

# 配置信息
REMOTE_HOST="ec2-user@3.93.149.236"
KEY_FILE="/Users/a1/work/productmindai.pem"
REMOTE_DIR="/home/productmindaidev"

echo "📡 远程服务器: $REMOTE_HOST"
echo "🔑 密钥文件: $KEY_FILE"
echo "📁 远程目录: $REMOTE_DIR"

# 检查密钥文件
if [ ! -f "$KEY_FILE" ]; then
    echo "❌ 密钥文件不存在: $KEY_FILE"
    exit 1
fi

echo "✅ 密钥文件检查通过"

# 1. 上传迁移脚本
echo ""
echo "📤 上传迁移脚本到远程服务器..."
scp -i "$KEY_FILE" move-templates-to-static.sh "$REMOTE_HOST:$REMOTE_DIR/"

if [ $? -eq 0 ]; then
    echo "✅ 迁移脚本上传成功"
else
    echo "❌ 迁移脚本上传失败"
    exit 1
fi

# 2. 上传修改后的生成器（如果需要）
echo ""
echo "📤 上传修改后的模板生成器..."
scp -i "$KEY_FILE" aws-backend/enhanced-template-generator.mjs "$REMOTE_HOST:$REMOTE_DIR/aws-backend/"

if [ $? -eq 0 ]; then
    echo "✅ 模板生成器上传成功"
else
    echo "⚠️  模板生成器上传失败，但不影响迁移操作"
fi

# 3. 设置脚本执行权限并执行迁移
echo ""
echo "🔧 在远程服务器上执行迁移..."
ssh -i "$KEY_FILE" "$REMOTE_HOST" << 'EOF'
    cd /home/productmindaidev
    
    echo "📍 当前工作目录: $(pwd)"
    
    # 设置执行权限
    chmod +x move-templates-to-static.sh
    echo "✅ 设置脚本执行权限"
    
    # 执行迁移脚本
    echo ""
    echo "🚀 开始执行迁移脚本..."
    ./move-templates-to-static.sh
    
    echo ""
    echo "📊 迁移后目录检查:"
    if [ -d "static/pdhtml" ]; then
        echo "✅ static/pdhtml 目录存在"
        PROJECT_COUNT=$(find static/pdhtml -maxdepth 1 -type d | grep -v "^static/pdhtml$" | wc -l)
        FILE_COUNT=$(find static/pdhtml -name "*.html" | wc -l)
        echo "📁 项目目录数: $PROJECT_COUNT"
        echo "📄 HTML文件数: $FILE_COUNT"
        
        # 显示b6bf6237项目的文件（如果存在）
        if [ -d "static/pdhtml/b6bf6237-a8d2-4910-836f-6477604f0a2d" ]; then
            echo ""
            echo "🎯 目标项目 b6bf6237-a8d2-4910-836f-6477604f0a2d 文件列表:"
            ls -la "static/pdhtml/b6bf6237-a8d2-4910-836f-6477604f0a2d/" | head -10
        fi
    else
        echo "❌ static/pdhtml 目录不存在"
    fi
EOF

echo ""
echo "🎉 远程迁移执行完成！"

# 4. 测试访问（可选）
echo ""
echo "🧪 测试新路径访问..."
echo "正在测试静态文件服务器响应..."

# 简单的连接测试
ssh -i "$KEY_FILE" "$REMOTE_HOST" "curl -s -I http://localhost:3030/ | head -5" 2>/dev/null

echo ""
echo "💡 后续操作提醒:"
echo "=================="
echo "1. 🔄 重启远程服务器上的静态文件服务器"
echo "2. 🧪 测试新路径访问: /static/pdhtml/<project_id>/<template_version_id>.html"
echo "3. 🔗 更新前端页面中的链接路径"
echo "4. 📝 生成新的模板详情页面将自动保存到 static/pdhtml/"

echo ""
echo "🔗 测试链接示例:"
echo "   http://[服务器IP]:3030/static/pdhtml/b6bf6237-a8d2-4910-836f-6477604f0a2d/425e6f98-8aa7-40b5-ae9a-36b9b5058a6f.html" 