# 生成进度对话框状态清理机制

## 概述
为了确保页面刷新或重新加载时能够彻底清除执行进度对话框的状态，我们实现了完整的五层清理机制。

## 清理机制实现

### 1. 页面加载时清理
**位置**: `src/utils/stateManager.ts` - `constructor` 和 `cleanupOnLoad` 方法

```typescript
private constructor() {
  console.log('[StateManager] 初始化，开始清理遗留状态...');
  this.cleanupOnLoad();
}

private cleanupOnLoad(): void {
  console.log('[StateManager] 开始页面加载清理...');
  const keysToClean = [
    'generationState',
    'tempGenerationData',
    'lastActiveGeneration',
    'generationProgress',
    'currentGeneratingTemplate',
    'generationResults'
  ];
  // 清理 localStorage 和 sessionStorage
}
```

### 2. 组件初始化时清理
**位置**: `src/components/ProjectSelector.tsx` - 初始化 `useEffect`

```typescript
useEffect(() => {
  console.log('[ProjectSelector] 初始化，清理遗留生成状态...');
  stateManager.clearState('generationState');
  stateManager.clearState('generationProgress');
  stateManager.clearState('currentGeneratingTemplate');
  stateManager.clearState('generationResults');
  resetGenerationState();
}, []);
```

### 3. 组件卸载时清理
**位置**: `src/components/ProjectSelector.tsx` - 清理 `useEffect`

```typescript
useEffect(() => {
  console.log('[ProjectSelector] 组件挂载');
  return () => {
    console.log('[ProjectSelector] 组件卸载，开始清理...');
    stateManager.clearState('generationState');
    // ... 清理其他状态
    resetGenerationState();
  };
}, []);
```

### 4. 生成完成时清理
**位置**: `src/components/ProjectSelector.tsx` - `handleGenerateAll` 函数

```typescript
// 生成开始前清理
console.log('[ProjectSelector] 清理旧的生成状态...');
stateManager.clearState('generationState');

// 生成完成后清理
console.log('[ProjectSelector] 批量生成完成，清理状态...');
stateManager.clearState('generationState');

// finally 块中确保清理
finally {
  console.log('[ProjectSelector] 批量生成结束，执行最终清理...');
  stateManager.clearState('generationState');
}
```

### 5. 发生错误时清理
**位置**: `src/components/ProjectSelector.tsx` - `ErrorBoundary` 类

```typescript
static getDerivedStateFromError(error: Error): ErrorBoundaryState {
  console.log('[ErrorBoundary] 捕获到错误，开始清理所有状态...');
  stateManager.cleanupAll();
  stateManager.clearState('generationState');
  // ... 清理其他状态
  return { hasError: true };
}
```

## 日志输出

每个清理点都添加了详细的日志，格式为：
- `[组件名] 操作描述`
- 包含状态预览、大小等信息
- 错误时输出详细错误信息

## 验证方法

1. **正常刷新页面**
   - 打开浏览器控制台
   - 刷新页面
   - 查看日志：应该看到 `[StateManager] 初始化` 和清理相关日志

2. **生成过程中刷新**
   - 开始批量生成
   - 在生成过程中刷新页面
   - 确认进度对话框不会异常显示

3. **组件切换**
   - 切换到其他页面
   - 返回项目页面
   - 确认状态已重置

4. **错误恢复**
   - 触发错误（如网络断开）
   - 查看错误边界显示
   - 确认状态已清理

## 本地存储键

需要清理的 localStorage 键：
- `generationState` - 主要生成状态
- `generationProgress` - 进度百分比
- `currentGeneratingTemplate` - 当前生成的模板
- `generationResults` - 生成结果数组
- `tempGenerationData` - 临时数据
- `lastActiveGeneration` - 最后活跃的生成任务

## 注意事项

1. 所有清理操作都包裹在 try-catch 中，避免清理失败影响正常流程
2. 使用 `mountedRef` 检查组件是否已卸载，避免内存泄漏
3. 清理顺序：先清理缓存，再重置组件状态
4. 日志中不输出敏感信息，只输出状态预览

## 故障排除

如果仍有问题：
1. 检查浏览器控制台是否有错误
2. 手动清除浏览器缓存
3. 检查 localStorage 中是否有残留数据
4. 查看网络请求是否正常 