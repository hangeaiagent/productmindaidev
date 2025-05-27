# 重复校验功能实现总结

## 概述

本次更新实现了完善的重复校验机制，确保在导入过程中按指定的user_id校验重复，避免重复导入产品/项目。

## 实现特点

### 1. 数据库层面防重复
- **唯一约束**: 创建了 `idx_user_projects_unique_name` 唯一索引
- **触发器检查**: 实现了 `check_duplicate_product_name()` 函数和触发器
- **忽略大小写**: 重复检查时忽略大小写差异

### 2. 应用层面批量校验
- **预加载现有项目**: 在导入开始时获取用户所有现有项目
- **批量过滤**: 在内存中进行快速重复检查
- **同批次去重**: 避免同一批次内的重复项目

### 3. 指定用户ID
- **固定用户ID**: `afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1`
- **按用户隔离**: 重复检查仅在指定用户范围内进行

## 修改的文件

### 1. AIbase采集器 (`netlify/functions/aibase-crawler.ts`)

#### 新增函数：
- `getUserExistingProjects(userId: string)`: 获取用户所有现有项目
- `checkProductExistsInSet(name: string, existingProjects: Set<string>)`: 检查产品是否存在
- `filterDuplicateProducts(products: AIBaseProduct[], userId: string)`: 批量过滤重复产品

#### 修改逻辑：
- 在导入过程开始时就进行重复过滤
- 移除保存时的单个重复检查
- 返回详细的重复统计信息

### 2. YC项目采集器 (`netlify/functions/yc-projects-crawler.ts`)

#### 新增函数：
- `getUserExistingProjects(userId: string)`: 获取用户所有现有项目
- `checkProjectExistsInSet(name: string, existingProjects: Set<string>)`: 检查项目是否存在
- `filterDuplicateProjects(projects: YCProject[], userId: string)`: 批量过滤重复项目

#### 修改逻辑：
- 采用与AIbase采集器相同的重复校验逻辑
- 在导入前进行批量过滤
- 返回新项目和重复项目的统计

### 3. 前端组件 (`src/components/AIBaseCrawler.tsx`)

#### 更新类型定义：
```typescript
interface CrawlResult {
  success: boolean;
  summary?: {
    totalFound: number;
    totalCrawled: number;
    newProducts: number;        // 新增
    duplicateProducts: number;  // 新增
    successfullySaved: number;
    errors: number;
  };
  duplicateProducts?: Array<{   // 新增
    name: string;
    originalName: string;
    description: string;
  }>;
  // ... 其他字段
}
```

#### 更新UI显示：
- 增加新产品和重复产品的统计显示
- 添加重复产品列表展示
- 优化统计网格布局（2x6列）

## 工作流程

### 1. 导入开始
```
1. 获取产品/项目列表
2. 调用 getUserExistingProjects(userId) 获取现有项目
3. 调用 filterDuplicateProducts() 进行批量过滤
4. 返回 { newProducts, duplicateProducts, existingProjects }
```

### 2. 保存阶段
```
1. 仅处理 newProducts 列表
2. 直接保存，无需再次检查重复
3. 记录保存结果和错误
```

### 3. 结果返回
```
{
  "summary": {
    "totalFound": 20,
    "totalCrawled": 20,
    "newProducts": 0,
    "duplicateProducts": 20,
    "successfullySaved": 0,
    "errors": 0
  },
  "duplicateProducts": [...],
  "savedProjects": [...]
}
```

## 性能优化

### 1. 内存中检查
- 使用 `Set<string>` 进行O(1)时间复杂度的重复检查
- 避免每个产品都查询数据库

### 2. 批量操作
- 一次性获取所有现有项目
- 批量过滤，减少数据库交互

### 3. 大小写标准化
- 统一转换为小写进行比较
- 避免大小写导致的重复

## 测试结果

### AIbase采集器测试
```json
{
  "success": true,
  "summary": {
    "totalFound": 20,
    "totalCrawled": 20,
    "newProducts": 0,
    "duplicateProducts": 20,
    "successfullySaved": 0,
    "errors": 0
  }
}
```

### YC项目采集器测试
```json
{
  "success": true,
  "summary": {
    "totalFound": 15,
    "totalCrawled": 15,
    "newProducts": 0,
    "duplicateProducts": 15,
    "successfullySaved": 0,
    "errors": 0
  }
}
```

## 优势

1. **高效性**: 批量检查比逐个检查快得多
2. **准确性**: 数据库约束 + 应用层检查双重保障
3. **用户隔离**: 按指定user_id进行重复检查
4. **详细反馈**: 提供完整的重复统计和列表
5. **一致性**: 所有采集器使用相同的重复校验逻辑

## 注意事项

1. **用户ID固定**: 当前硬编码为 `afd0fdbc-4ad3-4e92-850b-7c26b2d8efc1`
2. **大小写敏感**: 重复检查时忽略大小写
3. **名称清理**: AIbase采集器会先清理产品名称再检查重复
4. **内存使用**: 大量项目时会占用更多内存，但通常可接受

## 未来改进

1. **动态用户ID**: 支持从请求参数获取用户ID
2. **模糊匹配**: 实现更智能的重复检测算法
3. **缓存机制**: 缓存现有项目列表，减少数据库查询
4. **批量更新**: 支持更新已存在项目的信息 