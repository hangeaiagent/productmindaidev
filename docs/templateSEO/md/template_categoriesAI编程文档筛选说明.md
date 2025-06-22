# Template Categories AI编程文档筛选说明

## 📋 概述

本文档详细说明了 `template-html-generator.mjs` 脚本中新增的基于 `template_categories` 表筛选逻辑的技术实现，该功能用于只处理可见分类（`isshow = 1`）下的模板版本数据。

---

## 🎯 筛选逻辑

### 核心需求
- **筛选条件**：只处理 `template_categories` 表中 `isshow = 1` 的记录
- **关联查询**：`template_categories` → `templates` → `template_versions`
- **移除旧条件**：去掉之前的 `like('template_id', '%10000000-0000-0000-0000-000000000%')` 筛选

### 数据库关系图
```
template_categories (isshow = 1)
    ↓ (category_id)
templates
    ↓ (template_id)
template_versions
```

---

## 🔧 技术实现

### 1. 查询策略

#### 单条记录查询（--id 参数）
```javascript
// 直接通过ID查询template_versions，然后检查关联的category是否可见
query = supabase
  .from('template_versions')
  .select(`
    id, 
    project_id, 
    output_content_zh, 
    output_content_en, 
    templates:template_id (
      name_zh,
      name_en,
      template_categories:category_id (
        name_zh,
        name_en,
        isshow
      )
    )
  `)
  .eq('id', onlyId);
```

#### 批量查询（无参数）
```javascript
// 从template_categories开始，筛选isshow=1的记录
query = supabase
  .from('template_categories')
  .select(`
    id,
    name_zh,
    name_en,
    isshow,
    templates!inner (
      id,
      name_zh,
      name_en,
      template_versions!inner (
        id,
        project_id,
        output_content_zh,
        output_content_en
      )
    )
  `)
  .eq('isshow', 1);
```

### 2. 数据处理逻辑

#### 单条记录处理
```javascript
if (onlyId) {
  if (data && data.length > 0) {
    const record = data[0];
    // 检查关联的category是否可见
    const category = record.templates?.template_categories;
    if (category && category.isshow === 1) {
      processedRecords.push({
        id: record.id,
        project_id: record.project_id,
        output_content_zh: record.output_content_zh,
        output_content_en: record.output_content_en,
        templates: {
          name_zh: record.templates.name_zh,
          name_en: record.templates.name_en
        }
      });
    } else {
      console.log(`⚠️ Record ${onlyId} belongs to a hidden category, skipping.`);
    }
  }
}
```

#### 批量记录处理
```javascript
else {
  // 展平嵌套结构
  if (data && data.length > 0) {
    data.forEach(category => {
      if (category.templates && category.templates.length > 0) {
        category.templates.forEach(template => {
          if (template.template_versions && template.template_versions.length > 0) {
            template.template_versions.forEach(version => {
              processedRecords.push({
                id: version.id,
                project_id: version.project_id,
                output_content_zh: version.output_content_zh,
                output_content_en: version.output_content_en,
                templates: {
                  name_zh: template.name_zh,
                  name_en: template.name_en
                }
              });
            });
          }
        });
      }
    });
  }
}
```

---

## 📊 数据库表结构

### template_categories 表
| 字段名 | 类型 | 说明 |
|--------|------|------|
| `id` | UUID | 分类ID（主键） |
| `name_zh` | TEXT | 中文分类名称 |
| `name_en` | TEXT | 英文分类名称 |
| `isshow` | BOOLEAN | 是否显示（1=显示，0=隐藏） |

### templates 表
| 字段名 | 类型 | 说明 |
|--------|------|------|
| `id` | UUID | 模板ID（主键） |
| `name_zh` | TEXT | 中文模板名称 |
| `name_en` | TEXT | 英文模板名称 |
| `category_id` | UUID | 分类ID（外键） |

### template_versions 表
| 字段名 | 类型 | 说明 |
|--------|------|------|
| `id` | UUID | 版本ID（主键） |
| `project_id` | UUID | 项目ID |
| `template_id` | UUID | 模板ID（外键） |
| `output_content_zh` | JSONB | 中文输出内容 |
| `output_content_en` | JSONB | 英文输出内容 |

---

## 🚀 使用方法

### 1. 单条记录生成
```bash
cd aws-backend
node template-html-generator.mjs --id <template_version_id>
```

**示例**：
```bash
node template-html-generator.mjs --id 01027bbc-d9e0-42f0-9111-1daa58cbd896
```

### 2. 批量生成
```bash
cd aws-backend
node template-html-generator.mjs
```

**说明**：批量生成会自动筛选所有 `isshow = 1` 的分类下的模板版本。

---

## 🔍 筛选效果

### 筛选前
- 处理所有 `template_versions` 记录
- 包含隐藏分类（`isshow = 0`）的记录

### 筛选后
- 只处理可见分类（`isshow = 1`）下的记录
- 自动跳过隐藏分类的记录
- 提供详细的跳过原因日志

### 日志示例
```
🔍 Fetching template versions from visible categories...
✅ Found 150 records to process.

Processing record ID: 0515df09-d03a-4908-8339-d3f0dfa2c48f
⚠️ No files generated for ID 0515df09-d03a-4908-8339-d3f0dfa2c48f, skipping database update.

🎉 All tasks completed successfully!
```

---

## ⚠️ 注意事项

### 1. 数据完整性
- 确保 `template_categories` 表的 `isshow` 字段正确设置
- 确保外键关系完整（`templates.category_id` → `template_categories.id`）

### 2. 性能考虑
- 批量查询使用 `!inner` 连接，确保只返回有关联数据的记录
- 单条查询使用可选连接，避免因关联数据缺失导致的查询失败

### 3. 错误处理
- 单条查询会检查分类可见性，隐藏分类的记录会被跳过
- 批量查询直接从可见分类开始，确保所有返回的记录都是可见的

---

## 🔧 故障排查

### 1. 查询返回空结果
**可能原因**：
- 所有分类的 `isshow` 都设置为 0
- 外键关系不完整
- 数据表为空

**解决方案**：
```sql
-- 检查可见分类数量
SELECT COUNT(*) FROM template_categories WHERE isshow = 1;

-- 检查关联数据完整性
SELECT tc.id, tc.name_zh, COUNT(t.id) as template_count
FROM template_categories tc
LEFT JOIN templates t ON tc.id = t.category_id
WHERE tc.isshow = 1
GROUP BY tc.id, tc.name_zh;
```

### 2. 单条记录被跳过
**可能原因**：
- 该记录属于隐藏分类
- 关联的分类记录不存在

**解决方案**：
```sql
-- 检查特定记录的分类状态
SELECT tv.id, tc.name_zh, tc.isshow
FROM template_versions tv
JOIN templates t ON tv.template_id = t.id
JOIN template_categories tc ON t.category_id = tc.id
WHERE tv.id = 'your-template-version-id';
```

---

## 📈 性能优化建议

### 1. 索引优化
```sql
-- 为筛选字段创建索引
CREATE INDEX idx_template_categories_isshow ON template_categories(isshow);
CREATE INDEX idx_templates_category_id ON templates(category_id);
CREATE INDEX idx_template_versions_template_id ON template_versions(template_id);
```

### 2. 查询优化
- 使用 `!inner` 连接减少数据传输
- 只选择必要的字段
- 避免在循环中进行数据库查询

### 3. 批量处理
- 对于大量数据，考虑分批处理
- 添加进度显示和错误恢复机制

---

## 🔄 版本历史

### v2.0.0 (当前版本)
- ✅ 实现基于 `template_categories.isshow` 的筛选
- ✅ 支持单条和批量查询
- ✅ 移除旧的 `template_id` 模糊匹配筛选
- ✅ 添加详细的日志和错误处理

### v1.0.0 (历史版本)
- ❌ 使用 `like('template_id', '%10000000-0000-0000-0000-000000000%')` 筛选
- ❌ 无法区分可见和隐藏分类

---

## 📞 技术支持

如遇到问题或需要进一步支持，请参考：
- 技术文档：`docs/页面样式Mermaid总结.md`
- 环境配置：`docs/环境变量文件说明.md`
- 故障排查：`TEMPLATES_ACCESS_FIX.md`

---

*最后更新：2024年12月* 