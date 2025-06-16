# 分类名称自动翻译服务使用指南

## 功能概述

这个服务用于自动将 `user_projectscategory` 表中的中文分类名称翻译成英文，并更新到 `category_name_en` 字段。

## 数据库变更

### 1. 添加英文字段

首先需要为 `user_projectscategory` 表添加 `category_name_en` 字段：

```sql
-- 在Supabase后台SQL编辑器中执行
-- 或者上传并执行 sql/add-category-name-en-field.sql 文件

ALTER TABLE user_projectscategory 
ADD COLUMN IF NOT EXISTS category_name_en VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_user_projectscategory_name_en 
ON user_projectscategory(category_name_en);

COMMENT ON COLUMN user_projectscategory.category_name_en IS '分类英文名称';
```

## 使用方法

### 方法一：使用NPM脚本（推荐）

1. **检查翻译状态**
```bash
npm run check-translation
```
这会显示：
- 总分类数量统计
- 已有英文名称的记录数
- 需要翻译的记录数
- 详细的分类列表

2. **执行自动翻译**
```bash
npm run translate-categories
```
这会：
- 查询所有 `category_name_en` 为空的记录
- 检测 `category_name` 是否包含中文
- 调用AI翻译服务将中文翻译成英文
- 更新 `category_name_en` 字段

### 方法二：直接调用API

```bash
curl -X POST https://your-domain.netlify.app/.netlify/functions/translate-category-names
```

### 方法三：在浏览器中访问

访问：`https://your-domain.netlify.app/.netlify/functions/translate-category-names`

## 翻译逻辑

### 1. 查询条件
```sql
SELECT * FROM user_projectscategory 
WHERE category_name_en IS NULL OR category_name_en = ''
ORDER BY category_level, id;
```

### 2. 中文检测
使用正则表达式 `/[\u4e00-\u9fff]/` 检测文本是否包含中文字符。

### 3. 翻译服务
- 使用 DeepSeek AI 进行高质量翻译
- 翻译失败时返回原文，确保系统稳定性
- 每次翻译后延迟500ms，避免API频率限制

### 4. 更新数据库
```sql
UPDATE user_projectscategory 
SET category_name_en = '翻译结果' 
WHERE id = 记录ID;
```

## 环境配置

确保以下环境变量已正确配置：

```bash
# Supabase配置
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# AI翻译服务配置
DEEPSEEK_API_KEY=your-deepseek-api-key

# Netlify站点URL（用于脚本调用）
NETLIFY_SITE_URL=https://your-domain.netlify.app
```

## 执行结果示例

### 检查翻译状态输出
```
📊 分类翻译状态统计:
=====================================
总分类数: 52
已有英文名称: 0 (0.0%)
需要翻译: 52 (100.0%)
包含中文: 52
非中文: 0

🔄 需要翻译的分类记录:
=====================================
1. [10] 🇨🇳 图像处理 (级别: 1)
2. [20] 🇨🇳 视频创作 (级别: 1)
3. [1010] 🇨🇳 图片背景移除 (级别: 2)
...
```

### 翻译执行结果
```
✅ 翻译任务执行成功!

📊 执行结果统计:
=====================================
总记录数: 52
成功翻译: 50
跳过处理: 0
失败记录: 2

✅ 成功翻译的记录:
1. 图像处理 -> Image Processing
2. 视频创作 -> Video Creation
3. 图片背景移除 -> Background Removal
...
```

## 错误处理

### 常见错误及解决方案

1. **Supabase连接错误**
   - 检查环境变量配置
   - 确认Supabase项目状态

2. **翻译API错误**
   - 检查DeepSeek API Key
   - 确认API配额充足

3. **权限错误**
   - 确认Supabase RLS策略允许更新操作
   - 检查API Key权限

## 安全注意事项

- 翻译服务使用公开的Netlify函数，建议在生产环境中添加身份验证
- API Key敏感信息通过环境变量管理
- 翻译失败时返回原文，不会丢失数据

## 维护建议

1. **定期检查**：使用 `npm run check-translation` 检查翻译状态
2. **批量处理**：新增分类后运行翻译服务
3. **质量检查**：定期审查翻译质量，必要时手动调整
4. **备份数据**：重要操作前建议备份数据库

## 文件结构

```
├── sql/
│   └── add-category-name-en-field.sql          # 数据库字段添加脚本
├── scripts/
│   ├── check-translation-status.js             # 翻译状态检查脚本
│   └── run-translation.js                      # 翻译执行脚本
├── netlify/functions/
│   └── translate-category-names.ts             # 翻译服务主函数
└── CATEGORY_TRANSLATION_GUIDE.md               # 本使用指南
```

## 技术细节

### DeepSeek AI 翻译配置
```typescript
{
  model: 'deepseek-chat',
  messages: [
    {
      role: 'system',
      content: '你是一个专业的中英文翻译专家。请将提供的中文文本翻译成准确、简洁的英文。只返回翻译结果，不要添加任何解释或其他内容。'
    },
    {
      role: 'user',
      content: `请将以下中文翻译成英文：${chineseText}`
    }
  ],
  max_tokens: 100,
  temperature: 0.3,
  stream: false
}
```

### 性能优化
- 批量处理：逐条翻译以保证质量
- 延迟控制：每次翻译间隔500ms
- 错误恢复：翻译失败时使用原文
- 索引优化：为英文字段创建索引

## 支持与反馈

如有问题或改进建议，请联系开发团队或在项目中提交Issue。 