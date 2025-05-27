# 大规模批量模板生成指南

## 🎯 功能概述

本系统支持对500+项目 × 25个模板进行大规模批量生成，具备以下特性：

- ✅ **双语生成**：同时生成中文和英文版本，保存到 `output_content_zh` 和 `output_content_en` 字段
- ✅ **分批处理**：自动拆分大任务，避免超时问题
- ✅ **断点续传**：支持中断后从上次位置继续执行
- ✅ **智能跳过**：自动跳过已生成的模板，避免重复工作
- ✅ **实时监控**：提供详细的进度跟踪和统计信息
- ✅ **错误处理**：自动重试机制，确保任务稳定执行

## 🚀 快速开始

### 1. 启动开发服务器

```bash
# 先关闭占用8888端口的进程
lsof -ti:8888 | xargs kill -9

# 启动开发服务器
npx netlify dev --port 8888
```

### 2. 运行大规模批量生成

```bash
# 基础用法：生成双语模板
node scripts/run-large-batch-generation.js

# 指定用户ID和语言
node scripts/run-large-batch-generation.js --user_id=afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1 --languages=zh,en

# 只生成中文版本
node scripts/run-large-batch-generation.js --languages=zh

# 指定特定模板
node scripts/run-large-batch-generation.js --templates=0346ed34-aa1a-4727-b1a5-2e4b86114568,0a6f134b-44f0-496b-b396-04ba2c9daa96

# 重新开始（忽略之前的进度）
node scripts/run-large-batch-generation.js --restart
```

## 📋 参数说明

| 参数 | 类型 | 默认值 | 说明 | 示例 |
|------|------|--------|------|------|
| `user_id` | string | afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1 | 用户ID | `--user_id=xxx` |
| `languages` | string | zh,en | 生成语言，逗号分隔 | `--languages=zh,en` |
| `templates` | string | 全部 | 模板ID列表，逗号分隔 | `--templates=uuid1,uuid2` |
| `table` | string | user_projects | 数据表名 | `--table=user_projects` |
| `limit` | number | 50 | 每次查询的项目数 | `--limit=100` |
| `restart` | boolean | false | 重新开始，忽略进度 | `--restart` |

## 🔧 配置参数

在 `scripts/run-large-batch-generation.js` 中可以调整以下配置：

```javascript
const CONFIG = {
  baseUrl: 'http://localhost:8888/.netlify/functions/batch-generate-templates',
  batchSize: 3,           // 每批处理的项目数
  templateBatchSize: 2,   // 每批处理的模板数
  maxExecutionTime: 25000, // 单次执行最大时间(毫秒)
  retryAttempts: 3,       // 失败重试次数
  retryDelay: 5000,       // 重试延迟(毫秒)
  progressFile: './batch-progress.json', // 进度保存文件
  logFile: './batch-generation.log'      // 日志文件
};
```

## 📊 进度监控

### 实时日志
执行过程中会显示详细的实时日志：

```
[2025-05-27T17:10:00.000Z] [INFO] 🚀 开始大规模批量模板生成任务
[2025-05-27T17:10:01.000Z] [INFO] === 执行第 1 个批次 ===
[2025-05-27T17:10:02.000Z] [INFO] 执行批次: offset=0, template_offset=0
[2025-05-27T17:10:05.000Z] [INFO] 批次完成: 生成=2, 跳过=1, 错误=0, 耗时=3000ms
[2025-05-27T17:10:05.000Z] [INFO] 进度已保存: 3/unknown

📊 总体进度统计:
   生成: 2 个模板
   跳过: 1 个模板
   错误: 0 个模板
   批次: 1 个
   开始时间: 2025-05-27T17:10:00.000Z
   最后更新: 2025-05-27T17:10:05.000Z
```

### 进度文件
进度会自动保存到 `batch-progress.json`：

```json
{
  "current_offset": 3,
  "template_offset": 0,
  "total_estimated": "unknown",
  "stats": {
    "generated": 2,
    "skipped": 1,
    "errors": 0,
    "batches_completed": 1,
    "start_time": "2025-05-27T17:10:00.000Z",
    "last_update": "2025-05-27T17:10:05.000Z"
  },
  "last_batch_info": {
    "has_more_projects": true,
    "has_more_templates": false,
    "next_project_offset": 3,
    "next_template_offset": 0
  }
}
```

### 日志文件
详细日志会保存到 `batch-generation.log` 文件中，便于后续分析。

## 🔄 断点续传

如果任务中断（网络问题、服务器重启等），可以直接重新运行脚本：

```bash
# 从上次中断的位置继续
node scripts/run-large-batch-generation.js

# 或者重新开始
node scripts/run-large-batch-generation.js --restart
```

系统会自动：
1. 检查 `batch-progress.json` 文件
2. 从上次的 `current_offset` 和 `template_offset` 继续
3. 恢复之前的统计信息

## 🎯 任务规模估算

### 计算公式
```
总任务数 = 项目数量 × 模板数量 × 语言数量
```

### 示例场景
- **500个项目 × 25个模板 × 2种语言 = 25,000个生成任务**
- **每批处理 3个项目 × 2个模板 = 6个任务/批次**
- **预计需要 25,000 ÷ 6 ≈ 4,167个批次**
- **每批次约25秒，总耗时约 29小时**

### 优化建议
1. **调整批次大小**：根据服务器性能调整 `batchSize` 和 `templateBatchSize`
2. **分时段执行**：可以分多个时段执行，利用断点续传功能
3. **监控资源**：注意服务器CPU、内存和数据库连接数

## 🛠️ 故障排除

### 常见问题

#### 1. 端口占用
```bash
# 错误：Could not acquire required 'port': '8888'
lsof -ti:8888 | xargs kill -9
npx netlify dev --port 8888
```

#### 2. 数据库连接问题
```bash
# 错误：relation "public.projects" does not exist
# 解决：使用正确的表名
node scripts/run-large-batch-generation.js --table=user_projects
```

#### 3. 外键约束错误
```bash
# 错误：Key (created_by)=(xxx) is not present in table "users"
# 解决：使用有效的用户ID
node scripts/run-large-batch-generation.js --user_id=afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1
```

#### 4. 超时问题
```bash
# 错误：请求超时
# 解决：调整超时配置或减少批次大小
```

### 调试模式

```bash
# 测试模式：只查询不生成
curl "http://localhost:8888/.netlify/functions/batch-generate-templates?limit=0&test_mode=true&languages=zh"

# 演示模式：测试双语生成
curl "http://localhost:8888/.netlify/functions/batch-generate-templates?demo=true&languages=zh,en"

# 小批次测试
node scripts/run-large-batch-generation.js --limit=5 --templates=0346ed34-aa1a-4727-b1a5-2e4b86114568
```

## 📈 性能优化

### 1. 服务器配置
- **CPU**：多核处理器，支持并发AI调用
- **内存**：至少8GB，处理大量数据
- **网络**：稳定的网络连接，避免超时

### 2. 数据库优化
- **连接池**：配置合适的数据库连接池大小
- **索引**：确保相关字段有适当的索引
- **分区**：对大表考虑分区策略

### 3. AI服务优化
- **API限制**：注意AI服务的调用频率限制
- **并发控制**：避免过多并发请求导致限流
- **缓存策略**：对相似内容考虑缓存机制

## 🔍 监控和分析

### 实时监控
```bash
# 监控日志
tail -f batch-generation.log

# 监控进度
watch -n 5 'cat batch-progress.json | jq .'

# 监控系统资源
top -p $(pgrep -f "netlify dev")
```

### 数据分析
```sql
-- 查看生成统计
SELECT 
  COUNT(*) as total_versions,
  COUNT(CASE WHEN output_content_zh IS NOT NULL THEN 1 END) as zh_count,
  COUNT(CASE WHEN output_content_en IS NOT NULL THEN 1 END) as en_count,
  AVG(LENGTH(output_content::text)) as avg_content_length
FROM template_versions 
WHERE created_at > NOW() - INTERVAL '1 day';

-- 查看模板覆盖率
SELECT 
  t.name_zh,
  COUNT(tv.id) as version_count,
  COUNT(DISTINCT tv.project_id) as project_count
FROM templates t
LEFT JOIN template_versions tv ON t.id = tv.template_id
GROUP BY t.id, t.name_zh
ORDER BY version_count DESC;
```

## 🎉 成功案例

### 测试结果示例
```
🎉 大规模批量生成任务完成！
最终统计:
   总生成: 1,250 个模板
   总跳过: 8,750 个模板
   总错误: 0 个模板
   总批次: 2,084 个
   总耗时: 14,400,000ms (4小时)
```

### 数据库验证
```sql
-- 验证双语字段是否正确保存
SELECT 
  id,
  template_id,
  project_id,
  CASE 
    WHEN output_content_zh IS NOT NULL THEN '✅'
    ELSE '❌'
  END as zh_saved,
  CASE 
    WHEN output_content_en IS NOT NULL THEN '✅'
    ELSE '❌'
  END as en_saved,
  created_at
FROM template_versions 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;
```

## 📞 技术支持

如果遇到问题，请：

1. **检查日志**：查看 `batch-generation.log` 文件
2. **查看进度**：检查 `batch-progress.json` 文件
3. **测试连接**：确认服务器和数据库连接正常
4. **小规模测试**：先用小数据集测试功能
5. **联系支持**：提供详细的错误信息和日志 