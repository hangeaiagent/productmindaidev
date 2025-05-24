// 全局状态管理器
export class StateManager {
  private static instance: StateManager;
  private cleanupCallbacks: Set<() => void> = new Set();

  private constructor() {
    // 在页面加载时清理所有遗留状态
    console.log('[StateManager] 初始化，开始清理遗留状态...');
    this.cleanupOnLoad();
  }

  static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  // 注册清理回调
  registerCleanup(callback: () => void): void {
    this.cleanupCallbacks.add(callback);
  }

  // 注销清理回调
  unregisterCleanup(callback: () => void): void {
    this.cleanupCallbacks.delete(callback);
  }

  // 执行所有清理回调
  cleanupAll(): void {
    console.log('[StateManager] 执行所有清理回调...');
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('[StateManager] 清理状态时出错:', error);
      }
    });
    
    // 清理所有已知的关键状态
    this.cleanupOnLoad();
  }

  // 页面加载时的清理
  private cleanupOnLoad(): void {
    console.log('[StateManager] 开始页面加载清理...');
    
    // 清理所有可能的遗留状态
    const keysToClean = [
      'generationState',
      'tempGenerationData',
      'lastActiveGeneration',
      'generationProgress',
      'currentGeneratingTemplate',
      'generationResults'
    ];

    keysToClean.forEach(key => {
      try {
        const existingValue = localStorage.getItem(key);
        if (existingValue) {
          console.log(`[StateManager] 清理遗留状态: ${key}`, {
            oldValue: existingValue.substring(0, 100) + '...'
          });
          localStorage.removeItem(key);
        }
      } catch (error) {
        console.error(`[StateManager] 清理 ${key} 时出错:`, error);
      }
    });

    // 清理 sessionStorage
    try {
      const sessionKeys = Object.keys(sessionStorage);
      if (sessionKeys.length > 0) {
        console.log('[StateManager] 清理 sessionStorage，包含的键:', sessionKeys);
        sessionStorage.clear();
      }
    } catch (error) {
      console.error('[StateManager] 清理 sessionStorage 时出错:', error);
    }
    
    console.log('[StateManager] 页面加载清理完成');
  }

  // 安全的状态存储
  saveState(key: string, state: any): void {
    try {
      const stateStr = JSON.stringify(state);
      console.log(`[StateManager] 保存状态: ${key}`, {
        size: stateStr.length,
        preview: stateStr.substring(0, 100) + '...'
      });
      localStorage.setItem(key, stateStr);
    } catch (error) {
      console.error(`[StateManager] 保存状态 ${key} 时出错:`, error);
    }
  }

  // 安全的状态读取
  loadState<T>(key: string): T | null {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        console.log(`[StateManager] 读取状态: ${key}`, {
          size: saved.length,
          preview: saved.substring(0, 100) + '...'
        });
        return JSON.parse(saved);
      }
      return null;
    } catch (error) {
      console.error(`[StateManager] 读取状态 ${key} 时出错:`, error);
      localStorage.removeItem(key);
      return null;
    }
  }

  // 清理特定的状态
  clearState(key: string): void {
    try {
      const existingValue = localStorage.getItem(key);
      if (existingValue) {
        console.log(`[StateManager] 清理状态: ${key}`, {
          oldValueSize: existingValue.length
        });
      }
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`[StateManager] 清理状态 ${key} 时出错:`, error);
    }
  }
}

export const stateManager = StateManager.getInstance(); 