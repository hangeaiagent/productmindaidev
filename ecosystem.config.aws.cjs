// AWS后台服务PM2配置
require('dotenv').config({ path: './.env.aws-backend' });

module.exports = {
  apps: [{
    name: 'aws-backend',
    script: 'aws-backend/src/server.ts',
    interpreter: 'node',
    env: {
      NODE_ENV: 'production',
      PORT: process.env.AWS_BACKEND_PORT || 3000,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      AWS_REGION: process.env.AWS_REGION,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
      LOG_LEVEL: process.env.LOG_LEVEL || 'info',
      LOG_DIR: process.env.LOG_DIR || 'logs/aws-backend'
    },
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    error_file: 'logs/aws-backend-error.log',
    out_file: 'logs/aws-backend-out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    autorestart: true,
    restart_delay: 5000
  }]
}; 