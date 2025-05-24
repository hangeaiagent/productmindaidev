import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { stateManager } from './utils/stateManager';

// 在开发环境中导入调试工具
if (import.meta.env.DEV) {
  import('./utils/storageDebugger').then(() => {
    console.log('[Development] 存储调试工具已加载，可在控制台使用 StorageDebugger');
    console.log('可用命令：');
    console.log('- StorageDebugger.printGenerationState() - 查看存储状态');
    console.log('- StorageDebugger.clearAllGenerationState() - 清理所有生成状态');
    console.log('- StorageDebugger.startMonitoring() - 开始监控存储变化');
  });
}

// 在应用启动时清理所有遗留状态
console.log('[App] 应用启动，执行初始清理...');
stateManager.cleanupAll();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
