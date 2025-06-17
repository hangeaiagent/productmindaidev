#!/bin/bash

# 设置颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}===== 系统状态检查 =====${NC}"

# 检查PM2进程
echo -e "\n${GREEN}PM2进程状态：${NC}"
pm2 list

# 检查端口状态
echo -e "\n${GREEN}端口使用情况：${NC}"
lsof -i :5173 -i :8888 || echo "没有进程占用这些端口"

# 检查系统资源
echo -e "\n${GREEN}系统资源使用情况：${NC}"
echo "CPU负载："
uptime
echo -e "\n内存使用："
free -h
echo -e "\n磁盘使用："
df -h /

# 检查日志文件
echo -e "\n${GREEN}最新日志内容：${NC}"
echo "PM2错误日志："
tail -n 5 /root/.pm2/logs/*error.log 2>/dev/null || echo "没有错误日志"
echo -e "\n应用日志："
tail -n 5 /home/productmindaidev/logs/error-0.log 2>/dev/null || echo "没有应用日志"

npm run dev 