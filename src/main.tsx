import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { stateManager } from './utils/stateManager';

// 在应用启动时清理所有遗留状态
stateManager.cleanupAll();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
