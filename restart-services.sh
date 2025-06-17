#!/bin/bash
# ProductMind AI - 快速重启服务脚本
# 用于快速重启已部署的服务

echo "=== ProductMind AI 服务重启 ==="
echo "时间: $(date)"

# 确保在项目根目录
cd /home/productmindaidev || { echo "❌ 无法进入项目目录"; exit 1; }

# 1. 停止现有服务
echo "--> 步骤 1/4: 停止现有服务..."
pm2 stop all || echo "⚠️ PM2服务未运行"
sleep 2

# 2. 验证函数文件
echo "--> 步骤 2/4: 验证函数文件..."
if [ -d "netlify/functions-js" ]; then
    echo "✓ netlify/functions-js 目录存在"
    echo "函数文件数量: $(ls netlify/functions-js/*.cjs 2>/dev/null | wc -l)"
else
    echo "❌ netlify/functions-js 目录不存在"
    exit 1
fi

# 3. 重启服务
echo "--> 步骤 3/4: 重启服务..."
if [ -f "ecosystem.config.cjs" ]; then
    pm2 start ecosystem.config.cjs --env production
    pm2 save
    echo "✓ 使用 ecosystem.config.cjs 启动"
else
    echo "❌ ecosystem.config.cjs 不存在，请先运行完整部署"
    exit 1
fi

# 4. 验证服务状态
echo "--> 步骤 4/4: 验证服务状态..."
sleep 5

echo ""
echo "=== 服务状态 ==="
pm2 list

echo ""
echo "=== 健康检查 ==="
curl -s http://localhost:8888/health | head -c 200 || echo "❌ 健康检查失败"

echo ""
echo "=== API测试 ==="
curl -s http://localhost:8888/.netlify/functions/get-categories | head -c 100 || echo "❌ API测试失败"

echo ""
echo "=== 重启完成 ==="
echo "✓ 服务重启完成"
echo "✓ 访问地址: http://productmindai.com"
echo "✓ 健康检查: http://productmindai.com/health"
echo ""
echo "如有问题，查看日志: pm2 logs" 