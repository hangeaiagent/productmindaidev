// 本地存储调试工具
export class StorageDebugger {
  // 获取所有与生成相关的存储项
  static getAllGenerationKeys(): string[] {
    const keys: string[] = [];
    const targetKeys = [
      'generationState',
      'generationProgress',
      'currentGeneratingTemplate',
      'generationResults',
      'tempGenerationData',
      'lastActiveGeneration'
    ];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && targetKeys.includes(key)) {
        keys.push(key);
      }
    }
    
    return keys;
  }
  
  // 打印所有生成相关的存储状态
  static printGenerationState(): void {
    console.group('[StorageDebugger] 本地存储状态');
    
    const keys = this.getAllGenerationKeys();
    
    if (keys.length === 0) {
      console.log('✅ 没有找到生成相关的存储项，状态已清理');
    } else {
      console.log(`⚠️ 发现 ${keys.length} 个生成相关的存储项：`);
      
      keys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          console.group(`📦 ${key}`);
          console.log('大小:', value.length, '字节');
          try {
            const parsed = JSON.parse(value);
            console.log('内容:', parsed);
          } catch {
            console.log('内容 (原始):', value.substring(0, 100) + '...');
          }
          console.groupEnd();
        }
      });
    }
    
    console.groupEnd();
  }
  
  // 手动清理所有生成相关的存储
  static clearAllGenerationState(): void {
    console.log('[StorageDebugger] 开始清理所有生成相关存储...');
    
    const keys = this.getAllGenerationKeys();
    let cleared = 0;
    
    keys.forEach(key => {
      try {
        localStorage.removeItem(key);
        cleared++;
        console.log(`✅ 已清理: ${key}`);
      } catch (error) {
        console.error(`❌ 清理失败: ${key}`, error);
      }
    });
    
    console.log(`[StorageDebugger] 清理完成，共清理 ${cleared} 个项目`);
  }
  
  // 监控存储变化
  static startMonitoring(): void {
    console.log('[StorageDebugger] 开始监控存储变化...');
    
    // 保存原始的 setItem 和 removeItem 方法
    const originalSetItem = localStorage.setItem.bind(localStorage);
    const originalRemoveItem = localStorage.removeItem.bind(localStorage);
    
    // 重写 setItem
    localStorage.setItem = function(key: string, value: string) {
      console.log(`[StorageDebugger] 📝 写入: ${key}`, {
        size: value.length,
        preview: value.substring(0, 50) + '...'
      });
      originalSetItem(key, value);
    };
    
    // 重写 removeItem
    localStorage.removeItem = function(key: string) {
      console.log(`[StorageDebugger] 🗑️ 删除: ${key}`);
      originalRemoveItem(key);
    };
  }
  
  // 停止监控
  static stopMonitoring(): void {
    console.log('[StorageDebugger] 停止监控存储变化');
    window.location.reload(); // 重新加载以恢复原始方法
  }
}

// 将调试器暴露到全局，方便在控制台使用
if (typeof window !== 'undefined') {
  (window as any).StorageDebugger = StorageDebugger;
} 