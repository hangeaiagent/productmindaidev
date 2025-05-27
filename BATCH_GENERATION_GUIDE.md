# 批量生成模板使用指南 (数据库驱动版)

## 🎯 概述

批量生成模板功能现已升级为**数据库驱动**，动态从 `templates` 表获取模板信息和提示词内容。系统支持中英双语生成，智能版本管理，以及详细的进度跟踪。

## 📋 功能特性

### ✅ 数据库驱动的模板系统
- **动态模板获取** - 从 `templates` 表实时获取模板列表
- **提示词管理** - 使用数据库中的 `prompt_content` 字段
- **模板分类** - 支持按 `category_id` 分类管理
- **多语言支持** - `name_zh/name_en` 双语名称
- **版本控制** - 基于 `template_versions` 表的版本管理

### 🌍 多语言支持
- **中文 (zh)** - 使用 `name_zh` 和中文适配的提示词
- **英文 (en)** - 使用 `name_en` 和英文适配的提示词

### 🔄 智能特性
- **版本管理** - 基于 `template_id` 的自动版本递增
- **智能跳过** - 已存在版本的模板自动跳过
- **错误处理** - 详细的错误日志和恢复机制
- **进度跟踪** - 实时生成进度和状态反馈

## 🚀 执行方法

### 方法1: 直接函数调用（推荐）

```bash
# 基础批量生成（使用数据库中的所有模板）
curl "https://productmindai.com/.netlify/functions/batch-generate-templates"

# 指定特定模板ID（从数据库templates表获取）
curl "https://productmindai.com/.netlify/functions/batch-generate-templates?limit=20&languages=zh,en&templates=0346ed34-aa1a-4727-b1a5-2e4b86114568,0a6f134b-44f0-496b-b396-04ba2c9daa96"
```

### 方法2: 浏览器直接访问

```
https://productmindai.com/.netlify/functions/batch-generate-templates
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
| `templates` | string | 全部 | 模板ID列表，逗号分隔 | `templates=uuid1,uuid2` |
| `category` | string | 空 | 项目分类筛选条件 | `category=1020` |

### 📝 参数组合示例

```bash
# 使用特定模板生成中文文档
curl "https://productmindai.com/.netlify/functions/batch-generate-templates?limit=5&languages=zh&templates=0346ed34-aa1a-4727-b1a5-2e4b86114568"

# 为特定分类生成所有模板
curl "https://productmindai.com/.netlify/functions/batch-generate-templates?category=1020&limit=20"

# 使用多个模板生成英文文档
curl "https://productmindai.com/.netlify/functions/batch-generate-templates?languages=en&templates=0a6f134b-44f0-496b-b396-04ba2c9daa96,22a6333e-d310-45ae-9a41-7163e0afff60"
```

## 📋 获取可用模板列表

### 查询数据库模板

```sql
-- 查看所有可用模板
SELECT id, name_zh, name_en, description_zh, description_en
FROM templates 
ORDER BY no;

-- 按分类查看模板
SELECT t.id, t.name_zh, t.name_en, tc.name_zh as category_name
FROM templates t
JOIN template_categories tc ON t.category_id = tc.id
ORDER BY tc.name_zh, t.no;
```

### 常用模板ID参考

根据数据库中的模板数据：

```bash
# 市场趋势分析
templates=0346ed34-aa1a-4727-b1a5-2e4b86114568

# 竞品分析报告  
templates=0a6f134b-44f0-496b-b396-04ba2c9daa96

# 功能优先级排序
templates=22a6333e-d310-45ae-9a41-7163e0afff60

# MVP功能定义
templates=3ba30b8d-be77-4a90-a4a7-93d78143f338

# 产品路线图规划
templates=82d0deef-9a45-4ec8-86e3-15171f97db6c
```

## 📈 进度查看

### 1. 实时日志查看

**本地开发环境**：
```
📚 从数据库获取模板列表...
✅ 成功获取 17 个模板
📋 选择模板数量: 17
📊 找到 10 个项目，开始生成模板...
🤖 开始生成中文模板: 市场趋势预测
🎯 使用模板: 市场趋势预测
📝 构建提示词完成，长度: 1340
✅ 市场趋势预测 生成完成，内容长度: 2150
✅ 模板版本保存成功: OpenAI ChatGPT - 市场趋势预测 (版本 1)
```

### 2. 数据库检查

```sql
-- 查看最新生成的模板版本
SELECT tv.*, t.name_zh, t.name_en
FROM template_versions tv
JOIN templates t ON tv.template_id = t.id
ORDER BY tv.created_at DESC 
LIMIT 20;

-- 查看生成统计
SELECT 
  t.name_zh,
  COUNT(*) as version_count,
  MAX(tv.created_at) as latest_generation
FROM template_versions tv
JOIN templates t ON tv.template_id = t.id
WHERE tv.created_at > NOW() - INTERVAL '1 hour'
GROUP BY t.id, t.name_zh
ORDER BY version_count DESC;
```

## 🔄 后台运行特性

### ✅ 浏览器关闭后继续运行

**完全支持后台运行：**

1. **服务器端执行** - 函数在Netlify服务器运行
2. **数据库持久化** - 结果保存到 `template_versions` 表
3. **智能恢复** - 重启后自动跳过已生成的版本

### 📊 监控示例

```bash
# 分批执行不同模板类型
curl "https://productmindai.com/.netlify/functions/batch-generate-templates?templates=0346ed34-aa1a-4727-b1a5-2e4b86114568,0a6f134b-44f0-496b-b396-04ba2c9daa96&limit=10"

curl "https://productmindai.com/.netlify/functions/batch-generate-templates?templates=22a6333e-d310-45ae-9a41-7163e0afff60,3ba30b8d-be77-4a90-a4a7-93d78143f338&limit=10"
```

## 📚 数据库模板系统优势

### 🎯 **动态管理**
- ✅ 无需修改代码即可添加新模板
- ✅ 通过数据库管理模板内容和提示词
- ✅ 支持模板分类和排序

### 🔄 **版本控制**
- ✅ 基于 `template_id` 的精确版本管理
- ✅ 支持模板更新后的增量生成
- ✅ 完整的生成历史记录

### 🌍 **多语言支持**
- ✅ 数据库级别的双语支持
- ✅ 自动语言适配和提示词调整
- ✅ 灵活的本地化管理

## 🚨 注意事项

### ⚠️ 重要提醒

1. **模板依赖** - 确保数据库中有可用的模板数据
2. **权限配置** - 确保函数有读取 `templates` 表的权限  
3. **模板格式** - 提示词应该包含项目信息的占位符逻辑
4. **版本管理** - 使用正确的 `template_id` 进行版本跟踪

### 🔧 故障排除

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 未找到可用模板 | templates表为空 | 检查数据库数据 |
| 模板ID无效 | 指定的模板不存在 | 验证模板ID有效性 |
| 权限错误 | 数据库访问权限 | 检查RLS策略配置 |
| 提示词格式错误 | prompt_content格式问题 | 检查模板提示词内容 |

---

*最后更新：2024年12月*  
*文档版本：v3.0 - 数据库驱动版* 