// 全局状态管理器
export class StateManager {
  private static instance: StateManager;
  private cleanupCallbacks: Set<() => void> = new Set();

  private constructor() {
    // 在页面加载时清理所有遗留状态
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
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('清理状态时出错:', error);
      }
    });
  }

  // 页面加载时的清理
  private cleanupOnLoad(): void {
    // 清理所有可能的遗留状态
    const keysToClean = [
      'generationState',
      'tempGenerationData',
      'lastActiveGeneration'
    ];

    keysToClean.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`清理 ${key} 时出错:`, error);
      }
    });

    // 清理 sessionStorage
    try {
      sessionStorage.clear();
    } catch (error) {
      console.error('清理 sessionStorage 时出错:', error);
    }
  }

  // 安全的状态存储
  saveState(key: string, state: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error(`保存状态 ${key} 时出错:`, error);
    }
  }

  // 安全的状态读取
  loadState<T>(key: string): T | null {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error(`读取状态 ${key} 时出错:`, error);
      localStorage.removeItem(key);
      return null;
    }
  }

  // 清理特定的状态
  clearState(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`清理状态 ${key} 时出错:`, error);
    }
  }
}

export const stateManager = StateManager.getInstance(); 