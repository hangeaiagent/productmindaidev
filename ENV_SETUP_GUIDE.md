# 环境变量配置指南

## 📋 概述

为了安全起见，本项目不在代码中硬编码数据库连接信息。您需要配置环境变量来提供必要的连接信息。

## 🔧 配置步骤

### 1. 创建环境变量文件

在项目根目录创建 `.env` 文件：

```bash
# 复制环境变量模板
cp .env.example .env
```

### 2. 填写环境变量

编辑 `.env` 文件，填入您的 Supabase 项目信息：

```bash
# Supabase 数据库配置
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# 应用配置
NODE_ENV=development
PORT=3030
```

### 3. 或者使用命令行设置

如果不想创建 `.env` 文件，也可以使用命令行设置：

```bash
# 设置环境变量
export VITE_SUPABASE_URL="https://your-project-id.supabase.co"
export VITE_SUPABASE_ANON_KEY="your_supabase_anon_key_here"

# 运行应用
npm run dev
```

### 4. 验证配置

启动应用时，如果环境变量配置正确，应该能正常连接数据库。如果配置错误，会看到清晰的错误提示。

## 🔒 安全注意事项

### ✅ 已修复的文件

以下文件已移除硬编码的数据库连接信息：

- `generate-seo-pages-fixed.cjs` ✅
- `batch-generate-seo.cjs` ✅ 
- `generate-seo-pages.cjs` ✅
- `src/lib/supabase.ts` ✅
- `src/utils/functionCaller.ts` ✅

### 🚫 注意事项

1. **永远不要**将真实的数据库连接信息提交到代码仓库
2. **确保** `.env` 文件已添加到 `.gitignore` 中
3. **使用** `.env.example` 作为模板，但不包含真实数据
4. **分享代码**时，只分享 `.env.example`，不要分享 `.env`

### 📁 文件检查清单

```bash
# 确保这些文件存在且配置正确
✅ .env.example          # 环境变量模板（可提交）
✅ .env                  # 实际环境变量（不可提交，应在.gitignore中）
✅ .gitignore            # 包含 .env 条目
```

## 🛠️ 故障排除

### 错误：缺少必需的环境变量

如果看到类似错误：
```
❌ 错误: 缺少必需的环境变量
请设置以下环境变量:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
```

**解决方案：**
1. 检查 `.env` 文件是否存在
2. 检查变量名是否正确（注意大小写）
3. 检查变量值是否正确填写

### 错误：Supabase 连接失败

**可能原因：**
1. URL 格式错误
2. API 密钥无效
3. 网络连接问题

**解决方案：**
1. 验证 Supabase 项目 URL 格式：`https://your-project-id.supabase.co`
2. 确认 API 密钥来自正确的项目
3. 检查网络连接

## 📚 相关文档

- [Supabase 项目设置](https://supabase.com/docs/guides/getting-started)
- [环境变量最佳实践](https://12factor.net/config)
- [Node.js 环境变量](https://nodejs.org/en/learn/command-line/how-to-read-environment-variables-from-nodejs) 