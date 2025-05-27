# 批量生成模板使用指南

## 🎯 概述

批量生成模板功能允许您一次性为多个AI产品项目生成各种类型的产品文档模板。系统支持中英双语生成，智能版本管理，以及详细的进度跟踪。

## 📋 功能特性

### ✅ 支持的模板类型
- **PRD** - 产品需求文档 (Product Requirements Document)
- **MRD** - 市场需求文档 (Market Requirements Document) 
- **tech-arch** - 技术架构文档 (Technical Architecture Document)
- **business-canvas** - 商业模式画布 (Business Model Canvas)
- **user-journey** - 用户体验地图 (User Experience Map)

### 🌍 多语言支持
- **中文 (zh)** - 完整的中文模板生成
- **英文 (en)** - 专业的英文模板生成

### 🔄 智能特性
- **版本管理** - 自动版本号递增，避免覆盖
- **智能跳过** - 已存在的模板自动跳过
- **错误处理** - 详细的错误日志和恢复机制
- **进度跟踪** - 实时生成进度和状态反馈

## 🚀 执行方法

### 方法1: 直接函数调用（推荐）

```bash
# 基础批量生成（默认10个项目，中英双语，所有模板类型）
curl "https://你的netlify域名.netlify.app/.netlify/functions/batch-generate-templates"

# 指定参数的批量生成
curl "https://你的netlify域名.netlify.app/.netlify/functions/batch-generate-templates?limit=20&languages=zh,en&types=prd,mrd&category=1020"
```

### 方法2: 浏览器直接访问

```
https://你的netlify域名.netlify.app/.netlify/functions/batch-generate-templates
```

### 方法3: 本地开发环境

```bash
# 启动本地服务
npx netlify dev --port 8888

# 访问本地函数
curl "http://localhost:8888/.netlify/functions/batch-generate-templates"
```

## 📊 参数详解

| 参数 | 类型 | 默认值 | 说明 | 示例 |
|------|------|--------|------|------|
| `limit` | number | 10 | 处理的项目数量 | `limit=50` |
| `languages` | string | zh,en | 生成语言，逗号分隔 | `languages=zh` |
| `types` | string | 全部 | 模板类型，逗号分隔 | `types=prd,mrd` |
| `category` | string | 空 | 分类筛选条件 | `category=1020` |

### 📝 参数组合示例

```bash
# 只生成中文PRD文档，限制5个项目
curl "https://你的域名/.netlify/functions/batch-generate-templates?limit=5&languages=zh&types=prd"

# 为特定分类生成所有模板
curl "https://你的域名/.netlify/functions/batch-generate-templates?category=1020&limit=20"

# 只生成英文商业文档
curl "https://你的域名/.netlify/functions/batch-generate-templates?languages=en&types=business-canvas,mrd"
```

## 📈 进度查看

### 1. 实时日志查看

**Netlify部署环境**：
```bash
# 查看函数日志
netlify functions:log batch-generate-templates
```

**本地开发环境**：
- 在终端中直接查看实时输出日志

### 2. 日志内容解读

```
🚀 开始批量生成模板...
📋 生成参数: {"languages":["zh","en"],"templateTypes":["prd","mrd"],"categoryCode":"","limit":10}
📊 找到 10 个项目，开始生成模板...
🤖 开始生成中文模板: prd
📝 构建提示词完成，长度: 1205
✅ 产品需求文档 (PRD) 生成完成，内容长度: 2841
✅ 模板保存成功: OpenAI ChatGPT - 产品需求文档 (PRD) (版本 1)
✅ 生成完成: OpenAI ChatGPT - 产品需求文档 (PRD)
⏭️ 跳过已存在的模板: OpenAI ChatGPT - mrd (zh)
🎉 批量生成完成! {"generated":1,"skipped":1,"errors":0,"details":[...]}
```

### 3. 数据库检查

```sql
-- 查看生成的模板
SELECT name, type, language, created_at 
FROM templates 
ORDER BY created_at DESC 
LIMIT 20;

-- 查看版本信息
SELECT template_type, project_id, language, version_number, status
FROM template_versions 
ORDER BY created_at DESC 
LIMIT 20;
```

## 🔄 后台运行特性

### ✅ 浏览器关闭后继续运行

**是的！批量生成支持后台运行，主要原因：**

1. **服务器端执行** - 函数在Netlify服务器上运行，不依赖浏览器
2. **无状态设计** - 每次调用都是独立的，不需要保持连接
3. **数据库持久化** - 所有生成结果直接保存到Supabase数据库

### 📊 后台运行监控

```bash
# 方法1: 定期检查数据库
# 通过查询最新的template_versions表记录来监控进度

# 方法2: 设置webhook通知（可选）
# 在函数中添加完成通知逻辑

# 方法3: 分批执行（推荐大量数据）
# 将大批量任务分解为多个小批次
curl "https://你的域名/.netlify/functions/batch-generate-templates?limit=10&category=1020"
curl "https://你的域名/.netlify/functions/batch-generate-templates?limit=10&category=1030"
```

## ⚡ 性能优化建议

### 1. 分批处理
```bash
# 避免一次处理过多项目，建议每批10-50个
limit=20  # 推荐值
```

### 2. 错误恢复
```bash
# 如果部分失败，可以重新运行，系统会自动跳过已生成的模板
# 智能跳过机制确保不会重复生成
```

### 3. 资源监控
```bash
# 监控Netlify函数执行时间和内存使用
# 大批量任务建议分时段执行
```

## 🚨 注意事项

### ⚠️ 重要提醒

1. **函数超时** - Netlify免费版函数执行时间限制10秒，付费版25秒
2. **并发限制** - 避免同时启动多个批量生成任务
3. **API配额** - 注意AI服务的API调用限制
4. **存储空间** - 大量模板会占用数据库存储空间

### 🔧 故障排除

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 函数超时 | 处理项目过多 | 减少limit参数值 |
| AI生成失败 | API密钥问题 | 检查环境变量配置 |
| 数据库连接失败 | Supabase配置 | 验证数据库连接参数 |
| 内存不足 | 大批量处理 | 分批执行，减小批次大小 |

## 📚 示例场景

### 场景1: 新项目全量生成
```bash
# 为前20个项目生成所有类型的中英文模板
curl "https://你的域名/.netlify/functions/batch-generate-templates?limit=20&languages=zh,en"
```

### 场景2: 特定分类补充
```bash
# 为AI工具分类生成商业文档
curl "https://你的域名/.netlify/functions/batch-generate-templates?category=1020&types=business-canvas,mrd&languages=en"
```

### 场景3: 中文文档批量生成
```bash
# 快速生成中文PRD文档
curl "https://你的域名/.netlify/functions/batch-generate-templates?languages=zh&types=prd&limit=50"
```

## 📞 技术支持

如果遇到问题，请检查：

1. **环境变量** - 确保AI API密钥和数据库配置正确
2. **网络连接** - 确保服务器可以访问外部API
3. **数据库权限** - 确保Supabase权限配置正确
4. **函数日志** - 查看详细的错误信息

---

*最后更新：2024年12月* 

*文档版本：v2.0* 