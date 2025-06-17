#!/bin/bash

echo "=== 开始部署流程 ==="
cd /home/productmindaidev

echo "=== 1. 从GitHub更新最新代码 ==="
git pull origin main

echo "=== 2. 停止所有服务 ==="
pm2 kill
pkill -f "node"
pkill -f "vite"
pkill -f "netlify"
sleep 3

echo "=== 3. 清理端口 ==="
sudo lsof -ti :5173 | xargs -r sudo kill -9
sudo lsof -ti :8888 | xargs -r sudo kill -9
sleep 3

echo "=== 4. 构建前端 ==="
echo "构建前端..."
npm run build

echo "=== 5. 部署后台服务 ==="
pm2 start ecosystem.hybrid.cjs
sleep 10

echo "=== 6. 部署aws-backend服务 ==="
cd /home/productmindaidev/aws-backend
npm install
pm2 start ecosystem.aws.cjs
cd ..

echo "=== 7. 测试服务 ==="
sleep 5
echo "后端健康检查："
curl -s http://localhost:8888/health | head -3

echo "前端访问："
curl -I http://productmindai.com | head -3

echo "=== 8. 服务状态 ==="
pm2 list

echo "=== 9. 后端日志 ==="
pm2 logs productmind-backend --lines 10

echo "=== 部署完成 ===" 