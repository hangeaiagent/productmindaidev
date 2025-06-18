// 通用PM2配置文件 - 根据环境自动选择配置
require('dotenv').config({ path: './.env' });

// 检测环境
const isServer = require('fs').existsSync('/home/productmindaidev');
const projectDir = isServer ? '/home/productmindaidev' : process.cwd();

console.log(`PM2配置: 检测到${isServer ? '服务器' : '本地'}环境`);
console.log(`项目目录: ${projectDir}`);

module.exports = {
  apps: [
    {
      name: 'netlify-functions',
      script: 'backend-server.cjs',
      cwd: projectDir,
      env: {
        NODE_ENV: 'production',
        PORT: 8888,
        // Supabase环境变量
        VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'https://uobwbhvwrciaxloqdizc.supabase.co',
        VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
        VITE_SUPABASE_SERVICE_ROLE_KEY: process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
        // API密钥
        VITE_DEFAULT_API_KEY: process.env.VITE_DEFAULT_API_KEY,
        VITE_PERPLEXITY_API_KEY: process.env.VITE_PERPLEXITY_API_KEY,
        DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        // AWS配置
        AWS_REGION: process.env.AWS_REGION,
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      error_file: isServer ? '/home/productmindaidev/logs/frontend-error.log' : 'logs/frontend-error.log',
      out_file: isServer ? '/home/productmindaidev/logs/frontend-out.log' : 'logs/frontend-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 10
    }
  ]
}; 