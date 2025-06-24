# ProductMind AI Sitemap系统服务器部署报告

## 部署信息
- **部署时间**: 2025-06-24 12:14:10
- **部署用户**: a1
- **远程服务器**: ec2-user@3.93.149.236
- **远程路径**: /home/productmindaidev/sitemap-system

## 部署的文件
- ✅ generate-complete-sitemap.cjs
- ✅ generate-sitemap.sh
- ✅ check-sitemap-status.sh
- ✅ README.md
- ✅ sitemap-cron-setup.md

## 服务器配置
- **Node.js环境**: 已检查
- **依赖包**: 已安装
- **文件权限**: 已设置
- **定时任务**: 已配置（每周一凌晨2点）

## 可用命令

### 在服务器上执行：
```bash
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
```

### 从本地连接服务器：
```bash
# SSH连接到服务器
ssh -i /Users/a1/work/productmindai.pem ec2-user@3.93.149.236

# 直接执行sitemap生成
ssh -i /Users/a1/work/productmindai.pem ec2-user@3.93.149.236 "cd /home/productmindaidev/sitemap-system && bash quick-generate.sh"

# 检查远程状态
ssh -i /Users/a1/work/productmindai.pem ec2-user@3.93.149.236 "cd /home/productmindaidev/sitemap-system && bash check-sitemap-status.sh"
```

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
- 检查环境变量配置: `cat aws-backend/.env`
- 查看执行日志: `tail -f logs/sitemap-cron.log`
- 测试数据库连接: `node -e "require('dotenv').config({path:'aws-backend/.env'}); console.log('SUPABASE_URL:', !!process.env.SUPABASE_URL);"`

---
*部署完成时间: 2025-06-24 12:14:10*
