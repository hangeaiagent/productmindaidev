// 前端服务PM2配置
require('dotenv').config({ path: './.env.frontend' });

module.exports = {
  apps: [{
    name: 'netlify-functions',
    script: 'backend-server.cjs',
    env: {
      NODE_ENV: 'production',
      PORT: process.env.FRONTEND_PORT || 8888,
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
      VITE_SUPABASE_SERVICE_ROLE_KEY: process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
      VITE_DEFAULT_API_KEY: process.env.VITE_DEFAULT_API_KEY,
      VITE_PERPLEXITY_API_KEY: process.env.VITE_PERPLEXITY_API_KEY,
      DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      AWS_REGION: process.env.AWS_REGION,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY
    },
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    error_file: 'logs/frontend-error.log',
    out_file: 'logs/frontend-out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    autorestart: true,
    restart_delay: 5000
  }]
}; 