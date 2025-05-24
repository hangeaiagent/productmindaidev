# 多语言支持功能指南

## 功能概述

ProductMind AI 现在支持中英文双语功能，包括：

1. **自动语言检测**：系统自动识别用户输入的语言（中文或英文）
2. **自动翻译**：将用户输入自动翻译为另一种语言
3. **双语内容生成**：同时生成中文和英文版本的分析内容
4. **智能显示**：根据用户选择的界面语言显示对应内容

## 数据库变更

### user_projects 表新增字段
- `name_zh`: 项目中文名称
- `name_en`: 项目英文名称  
- `description_zh`: 项目中文描述
- `description_en`: 项目英文描述
- `source_language`: 原始输入语言 ('zh' | 'en')

### template_versions 表新增字段
- `output_content_zh`: 中文版本输出内容 (JSON)
- `output_content_en`: 英文版本输出内容 (JSON)
- `source_language`: 原始生成语言 ('zh' | 'en')

## 工作流程

### 1. 项目创建/编辑
```
用户输入项目名称和描述
↓
系统检测输入语言（中文/英文）
↓
验证名称和描述语言一致性
↓
自动翻译为另一种语言
↓
保存双语版本到数据库
```

### 2. 模板内容生成
```
用户输入产品描述
↓
系统检测输入语言
↓
生成主要语言版本内容
↓
翻译输入内容为另一种语言
↓
生成另一种语言版本内容
↓
同时保存中英文版本
```

## 技术实现

### 翻译服务 (TranslationService)
- **语言检测**: 基于正则表达式检测中文字符，短文本使用AI辅助
- **自动翻译**: 使用 DeepSeek AI 进行高质量翻译
- **批量处理**: 支持多个文本同时翻译
- **错误处理**: 翻译失败时返回原文，确保系统稳定性

### 类型定义更新
```typescript
interface Project {
  // 兼容性字段
  name: string;
  description: string | null;
  
  // 多语言字段
  name_zh: string;
  name_en: string;
  description_zh: string | null;
  description_en: string | null;
  source_language: 'zh' | 'en';
}

interface TemplateVersion {
  // 兼容性字段
  output_content: {
    content: string;
    annotations: any[];
  };
  
  // 多语言字段
  output_content_zh: {
    content: string;
    annotations: any[];
  };
  output_content_en: {
    content: string;
    annotations: any[];
  };
  source_language: 'zh' | 'en';
}
```

## 用户体验

### 前端界面
- 项目列表显示：根据当前界面语言显示对应的项目名称和描述
- 内容生成：自动检测用户输入语言，生成对应语言的内容
- 语言切换：用户切换界面语言时，自动显示对应语言的内容

### 自动化功能
- **智能检测**：无需用户手动选择语言，系统自动识别
- **无缝翻译**：用户无感知的后台翻译处理
- **错误恢复**：翻译失败时自动回退到原文

## 部署步骤

1. **运行数据库迁移**
   ```sql
   -- 应用迁移文件
   supabase migration up
   ```

2. **验证数据**
   ```sql
   -- 检查新字段是否添加成功
   SELECT name_zh, name_en, source_language FROM user_projects LIMIT 5;
   ```

3. **测试功能**
   - 创建中文项目，验证英文自动翻译
   - 创建英文项目，验证中文自动翻译
   - 生成模板内容，检查双语版本

## 性能考虑

### 翻译成本
- 每次项目保存需要2次翻译调用（名称+描述）
- 每次内容生成需要2次AI调用（主语言+翻译语言）
- 建议监控API使用量

### 优化建议
1. **缓存机制**: 对相同文本的翻译结果进行缓存
2. **批量处理**: 将多个翻译请求合并为一次调用
3. **异步处理**: 将翻译过程放到后台队列中处理

## 故障排除

### 常见问题

1. **语言检测不准确**
   - 检查输入文本长度，短文本可能检测困难
   - 查看日志中的检测结果
   - 考虑手动指定语言

2. **翻译质量问题**
   - 检查AI模型配置
   - 验证API密钥有效性
   - 考虑使用专业翻译服务

3. **数据库字段为空**
   - 检查迁移是否正确执行
   - 验证触发器和函数是否创建
   - 手动运行UPDATE语句补充数据

### 日志监控
```javascript
// 关键日志事件
- "语言检测结果"
- "翻译完成"  
- "双语版本保存成功"
- "翻译失败"
```

## 未来扩展

### 支持更多语言
- 日语、韩语、德语等
- 修改数据库schema添加新语言字段
- 扩展TranslationService支持多语言

### 翻译质量改进
- 集成专业翻译API（Google Translate、Azure Translator等）
- 添加人工审核机制
- 实现翻译质量评分

### 用户自定义
- 允许用户手动编辑翻译结果
- 提供翻译历史和版本控制
- 支持术语词典和翻译偏好设置 