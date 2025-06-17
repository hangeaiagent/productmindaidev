#!/bin/bash
# ProductMind AI - 快速重启脚本 (v1.1)
# 该脚本仅重启由PM2管理的服务，不执行部署操作

echo "=== [ProductMind AI] 启动服务快速重启... ==="

# 确保在项目根目录运行
cd /home/productmindaidev || { echo "无法进入项目目录，中止操作。"; exit 1; }

# --- 1. 重启服务 ---
echo "--> 步骤 1/2: 重启所有PM2服务..."
# 分别重启，一个失败不影响另一个
pm2 restart aws-backend || echo "AWS后端服务重启失败。"
pm2 restart netlify-functions || echo "Netlify函数服务重启失败。"
echo "服务重启指令已发送。"

# --- 2. 验证状态 ---
echo "--> 步骤 2/2: 验证重启后状态..."
sleep 3 # 等待服务响应

echo "--- PM2 状态 ---"
pm2 list

echo "--- 健康检查 (Netlify Functions) ---"
curl -s http://localhost:8888/health | python3 -m json.tool

echo "--- 健康检查 (AWS Backend) ---"
curl -s http://localhost:3000/health | python3 -m json.tool

echo "=========================================="
echo "✅ 快速重启完成！"
echo "=========================================="