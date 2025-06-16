# AI Products 页面设置指南

## 问题诊断

根据您的截图，`aws-backend/.env` 文件存在但我的工具无法访问。这通常是因为：

1. `.env` 文件被 `.gitignore` 忽略（安全最佳实践）
2. 文件权限设置限制访问
3. 工具权限限制

## 解决方案

### 步骤 1: 复制环境变量

从您的 `aws-backend/.env` 文件中复制 Supabase 配置，在项目根目录创建 `.env` 文件：

```bash
# 在项目根目录创建 .env 文件
touch .env
```

然后编辑 `.env` 文件，添加以下内容：

```env
# 从 aws-backend/.env 复制的 Supabase 配置
VITE_SUPABASE_URL=https://uobwbhvwrciaxloqdizc.supabase.co
VITE_SUPABASE_ANON_KEY=您的实际密钥（从 aws-backend/.env 复制）
```

### 步骤 2: 验证函数文件

确保以下文件存在且内容正确：

1. `netlify/functions-js/get-categories.cjs`
2. `netlify/functions-js/get-projects-by-category.cjs`

### 步骤 3: 检查数据库表

确保 Supabase 数据库中存在以下表：

- `user_projectscategory` - 分类表
- `user_projects` - 项目表

### 步骤 4: 本地测试

```bash
# 启动本地开发服务器
npx netlify dev --port 8888

# 在另一个终端测试 API
curl "http://localhost:8888/.netlify/functions/get-categories"
curl "http://localhost:8888/.netlify/functions/get-projects-by-category"
```

### 步骤 5: 访问页面

打开浏览器访问：`http://localhost:8888/ai-products`

## 常见问题

### 问题 1: "Database not configured"

**原因**: 环境变量未正确加载

**解决**: 
1. 检查根目录 `.env` 文件是否存在
2. 确认环境变量名称正确（`VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`）

### 问题 2: "relation does not exist"

**原因**: 数据库表名不匹配

**解决**: 
1. 确认数据库中存在 `user_projectscategory` 表
2. 如果表名不同，修改函数中的查询

### 问题 3: CORS 错误

**原因**: 跨域请求被阻止

**解决**: 
1. 确保函数返回正确的 CORS 头
2. 检查 `netlify.toml` 配置

## 快速命令

```bash
# 1. 设置环境变量（手动）
cp aws-backend/.env .env
# 编辑 .env，确保变量名以 VITE_ 开头

# 2. 启动开发服务器
npx netlify dev --port 8888

# 3. 测试函数
curl "http://localhost:8888/.netlify/functions/get-categories" | jq '.'
curl "http://localhost:8888/.netlify/functions/get-projects-by-category" | jq '.'

# 4. 访问页面
open "http://localhost:8888/ai-products"
```

## 安全注意事项

⚠️ **重要**: 不要将包含真实密钥的 `.env` 文件提交到 Git！

确保 `.gitignore` 包含：
```
.env
.env.local
.env.*.local
``` 