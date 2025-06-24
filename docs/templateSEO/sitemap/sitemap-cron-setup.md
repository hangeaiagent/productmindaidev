# Sitemap定时任务设置指南

## 📋 概述

本指南介绍如何设置ProductMind AI sitemap的定时生成任务，确保sitemap始终保持最新状态。

## ⏰ 推荐更新频率

### 1. 生产环境
- **频率**: 每周一次
- **时间**: 周一凌晨2点（避开高峰期）
- **原因**: 平衡SEO效果和服务器负载

### 2. 开发环境
- **频率**: 每日一次
- **时间**: 凌晨3点
- **原因**: 及时反映内容变更

### 3. 紧急更新
- **触发**: 大量内容发布后
- **方式**: 手动执行
- **场景**: 批量产品上线、重大功能发布

## 🛠️ Cron任务设置

### 1. 编辑crontab
```bash
# 打开crontab编辑器
crontab -e
```

### 2. 添加定时任务

#### 生产环境（每周）
```bash
# 每周一凌晨2点执行sitemap生成
0 2 * * 1 cd /Users/a1/work/productmindai0521 && bash docs/templateSEO/sitemap/generate-sitemap.sh >> logs/sitemap-cron.log 2>&1
```

#### 开发环境（每日）
```bash
# 每日凌晨3点执行sitemap生成
0 3 * * * cd /Users/a1/work/productmindai0521 && bash docs/templateSEO/sitemap/generate-sitemap.sh >> logs/sitemap-cron.log 2>&1
```

#### 测试任务（每5分钟）
```bash
# 测试用：每5分钟执行一次（仅用于调试）
*/5 * * * * cd /Users/a1/work/productmindai0521 && bash docs/templateSEO/sitemap/generate-sitemap.sh >> logs/sitemap-cron.log 2>&1
```

### 3. 验证cron任务
```bash
# 查看当前cron任务
crontab -l

# 检查cron服务状态
sudo systemctl status cron
```

## 📝 日志管理

### 1. 日志文件位置
```
logs/
├── sitemap-cron.log              # cron执行日志
├── sitemap-generation-*.log      # 详细生成日志
└── sitemap-report-*.md           # 执行报告
```

### 2. 日志查看命令
```bash
# 查看最新的cron日志
tail -f logs/sitemap-cron.log

# 查看最近的生成日志
ls -la logs/sitemap-generation-*.log | tail -5

# 查看最新的执行报告
ls -la logs/sitemap-report-*.md | tail -1
```

### 3. 日志清理
```bash
# 创建日志清理脚本
cat > logs/cleanup-old-logs.sh << 'CLEANUP'
#!/bin/bash
# 清理30天前的日志文件
find logs/ -name "sitemap-generation-*.log" -mtime +30 -delete
find logs/ -name "sitemap-report-*.md" -mtime +30 -delete
echo "$(date): 清理完成" >> logs/cleanup.log
CLEANUP

chmod +x logs/cleanup-old-logs.sh

# 添加到cron（每月1号执行）
# 0 1 1 * * cd /Users/a1/work/productmindai0521 && bash logs/cleanup-old-logs.sh
```

## 🔍 监控和告警

### 1. 执行状态监控
```bash
# 检查最近的执行状态
cat > docs/templateSEO/sitemap/check-sitemap-status.sh << 'STATUS'
#!/bin/bash
echo "🔍 Sitemap状态检查 - $(date)"
echo "=================================="

# 检查最新的cron日志
if [ -f "logs/sitemap-cron.log" ]; then
    echo "📝 最近的执行记录:"
    tail -10 logs/sitemap-cron.log
else
    echo "❌ 未找到cron日志文件"
fi

# 检查sitemap文件
echo -e "\n📄 Sitemap文件状态:"
files=("sitemap.xml" "sitemap-zh.xml" "sitemap-en.xml" "sitemap-index.xml" "sitemap-images.xml")
for file in "${files[@]}"; do
    if [ -f "public/$file" ]; then
        size=$(du -h "public/$file" | cut -f1)
        modified=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "public/$file" 2>/dev/null || stat -c "%y" "public/$file" 2>/dev/null | cut -d' ' -f1,2 | cut -d'.' -f1)
        echo "✅ $file ($size, 修改: $modified)"
    else
        echo "❌ $file 不存在"
    fi
done

# 检查远程访问
echo -e "\n🌐 远程访问检查:"
urls=("sitemap.xml" "sitemap-zh.xml" "sitemap-en.xml" "sitemap-index.xml")
for file in "${urls[@]}"; do
    status=$(curl -s -o /dev/null -w "%{http_code}" "https://productmindai.com/$file")
    if [ "$status" = "200" ]; then
        echo "✅ $file (HTTP $status)"
    else
        echo "❌ $file (HTTP $status)"
    fi
done
STATUS

chmod +x docs/templateSEO/sitemap/check-sitemap-status.sh
```

### 2. 邮件告警（可选）
```bash
# 创建告警脚本
cat > docs/templateSEO/sitemap/sitemap-alert.sh << 'ALERT'
#!/bin/bash
# Sitemap生成失败告警

LOG_FILE="logs/sitemap-cron.log"
ALERT_EMAIL="your-email@example.com"

# 检查最近的执行是否失败
if tail -10 "$LOG_FILE" | grep -q "❌\|失败\|错误"; then
    echo "Sitemap生成出现错误，请检查日志: $LOG_FILE" | mail -s "ProductMind AI Sitemap生成失败" "$ALERT_EMAIL"
fi
ALERT

chmod +x docs/templateSEO/sitemap/sitemap-alert.sh

# 在cron任务后添加告警检查
# 5 2 * * 1 cd /Users/a1/work/productmindai0521 && bash docs/templateSEO/sitemap/sitemap-alert.sh
```

## 🔧 故障排查

### 1. 常见问题

#### Cron任务不执行
```bash
# 检查cron服务
sudo systemctl status cron

# 检查cron日志
sudo tail -f /var/log/cron

# 验证任务语法
crontab -l
```

#### 环境变量问题
```bash
# 在cron任务中添加环境变量
0 2 * * 1 cd /Users/a1/work/productmindai0521 && /usr/local/bin/node docs/templateSEO/sitemap/generate-complete-sitemap.cjs >> logs/sitemap-cron.log 2>&1
```

#### 权限问题
```bash
# 检查脚本权限
ls -la docs/templateSEO/sitemap/generate-sitemap.sh

# 修复权限
chmod +x docs/templateSEO/sitemap/generate-sitemap.sh
chmod +x docs/templateSEO/sitemap/generate-complete-sitemap.cjs
```

### 2. 调试模式
```bash
# 手动执行测试
bash docs/templateSEO/sitemap/generate-sitemap.sh

# 查看详细输出
bash -x docs/templateSEO/sitemap/generate-sitemap.sh
```

## 📊 性能优化

### 1. 执行时间优化
- 避开网站访问高峰期
- 选择服务器负载较低的时间
- 考虑数据库维护时间窗口

### 2. 资源使用优化
```bash
# 限制CPU使用
nice -n 10 bash docs/templateSEO/sitemap/generate-sitemap.sh

# 限制内存使用（如果需要）
ulimit -v 1048576  # 限制为1GB
```

## 📋 维护清单

### 每周检查
- [ ] 查看cron执行日志
- [ ] 验证sitemap文件更新
- [ ] 检查远程访问状态
- [ ] 确认Google Search Console提交状态

### 每月检查
- [ ] 清理旧日志文件
- [ ] 检查磁盘空间使用
- [ ] 验证数据库连接
- [ ] 更新sitemap生成脚本（如需要）

### 季度检查
- [ ] 评估更新频率是否合适
- [ ] 检查SEO效果和收录情况
- [ ] 优化sitemap内容和结构
- [ ] 更新监控和告警策略

---

**注意**: 请根据实际需要调整cron任务的执行频率和时间，确保不会影响网站正常运行。
