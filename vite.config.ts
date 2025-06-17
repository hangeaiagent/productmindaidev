import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host:'0.0.0.0', // 必须配置此项
    port: 5173,
    strictPort: true, // 如果端口被占用则直接失败
    hmr: {
      clientPort: 5173 // 如果是通过代理访问
    },
    allowedHosts: [
      'localhost',
      'productmindai.com',
      'www.productmindai.com'
    ]
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
