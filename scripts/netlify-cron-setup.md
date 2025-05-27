# Netlify 定时批量生成设置指南

## 🌐 在 Netlify 上执行批量任务的方法

### 方法1: 本地控制生产环境（推荐）

```bash
# 在本地执行，控制生产环境
node scripts/production-batch-executor.cjs --languages=zh,en --restart
```

### 方法2: 使用外部 Cron 服务

#### 2.1 使用 GitHub Actions

创建 `.github/workflows/batch-generation.yml`:

```yaml
name: Batch Template Generation
on:
  schedule:
    - cron: '0 */2 * * *'  # 每2小时执行一次
  workflow_dispatch:  # 手动触发

jobs:
  batch-generate:
    runs-on: ubuntu-latest
    steps:
      - name: Call Netlify Function
        run: |
          curl -X GET "http://productmindai.com/.netlify/functions/scheduled-batch-generator?languages=zh,en&limit=10"
```

#### 2.2 使用 Cron-job.org

1. 访问 https://cron-job.org/
2. 创建新的 cron job
3. URL: `http://productmindai.com/.netlify/functions/scheduled-batch-generator?languages=zh,en&limit=5`
4. 设置执行频率：每30分钟执行一次

#### 2.3 使用 EasyCron

1. 访问 https://www.easycron.com/
2. 创建新任务
3. URL: `http://productmindai.com/.netlify/functions/scheduled-batch-generator?languages=zh,en&limit=5`
4. 设置时间间隔：30分钟

### 方法3: 浏览器手动执行

直接在浏览器中访问：

```
http://productmindai.com/.netlify/functions/scheduled-batch-generator?languages=zh,en&limit=10
```

### 方法4: 使用 Zapier 或 IFTTT

1. 创建定时触发器
2. 设置 Webhook 调用
3. URL: `http://productmindai.com/.netlify/functions/scheduled-batch-generator`
4. 参数: `languages=zh,en&limit=5`

## 🔄 链式执行策略

由于 Netlify Functions 有30秒限制，我们使用链式执行：

1. 每次执行处理少量数据（5-10个项目）
2. 返回下一批的URL
3. 外部服务继续调用下一批

### 示例链式执行流程：

```bash
# 第一批
curl "http://productmindai.com/.netlify/functions/scheduled-batch-generator?languages=zh,en&start_offset=0&limit=5"

# 响应包含 next_batch_url，继续调用
curl "http://productmindai.com/.netlify/functions/scheduled-batch-generator?languages=zh,en&start_offset=5&limit=5"

# 继续直到完成...
```

## 📊 监控和日志

### Netlify 函数日志

在 Netlify 控制台查看：
1. 登录 Netlify Dashboard
2. 选择你的站点
3. 进入 Functions 页面
4. 查看函数执行日志

### 外部监控

使用 Uptime Robot 或类似服务监控执行状态：
- URL: `http://productmindai.com/.netlify/functions/scheduled-batch-generator?languages=zh,en&limit=1`
- 检查频率：每30分钟

## 🎯 推荐配置

### 小规模定时执行（推荐）

```bash
# 每30分钟执行一次，每次处理5个项目
curl "http://productmindai.com/.netlify/functions/scheduled-batch-generator?languages=zh,en&limit=5"
```

### 大规模本地执行（最快）

```bash
# 本地一次性执行全部
node scripts/production-batch-executor.cjs --languages=zh,en --restart
```

## 💡 最佳实践

1. **小批次执行**：每次处理5-10个项目，避免超时
2. **定时间隔**：设置30分钟间隔，避免过于频繁
3. **错误处理**：监控执行状态，失败时重试
4. **进度跟踪**：通过数据库查询了解完成进度
5. **本地备份**：重要任务建议本地执行并备份日志 