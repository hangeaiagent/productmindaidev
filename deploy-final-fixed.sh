#!/bin/bash
# ProductMind AI - 修正版部署脚本 (v2.3)
# 修正了数据库表名和函数逻辑问题

echo "=== [ProductMind AI] 启动修正版部署脚本... ==="

# 确保在项目根目录运行
cd /home/productmindaidev || { echo "无法进入项目目录，中止操作。"; exit 1; }

# --- 1. 停止并清理服务 ---
echo "--> 步骤 1/6: 停止并清理旧的服务..."
pm2 stop all || echo "PM2服务未运行，跳过停止。"
pm2 delete all || echo "PM2无服务可删除，跳过删除。"
sudo pkill -f "node.*backend-server"
echo "PM2服务已清理。"

# --- 2. 修正权限并安装依赖 ---
echo "--> 步骤 2/6: 修正文件权限并安装依赖..."
sudo chown -R ec2-user:ec2-user /home/productmindaidev
npm install || { echo "依赖安装失败，中止操作。"; exit 1; }
# 确保安装dotenv包用于环境变量加载
npm install dotenv || echo "dotenv包可能已存在"
echo "文件准备就绪。"

# --- 3. 构建前端 ---
echo "--> 步骤 3/6: 构建前端静态文件..."
npm run build || { echo "前端构建失败，中止操作。"; exit 1; }
echo "前端构建完成。"

# --- 4. 验证函数文件 ---
echo "--> 步骤 4/6: 验证netlify/functions-js目录..."
if [ -d "netlify/functions-js" ]; then
    echo "✓ 找到 netlify/functions-js 目录"
    ls -la netlify/functions-js/
else
    echo "❌ netlify/functions-js 目录不存在，请先上传正确的函数文件"
    exit 1
fi

# --- 5. 创建正确的后端服务器 ---
echo "--> 步骤 5/6: 创建修正版 backend-server.cjs..."
cat > backend-server.cjs << 'EOF'
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8888;

console.log(`[${new Date().toISOString()}] Starting ProductMind Functions Server v4.1 on port ${PORT}`);

// 中间件
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 请求日志
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// 健康检查
app.get('/health', (req, res) => {
  const functionsDir = path.join(__dirname, 'netlify', 'functions-js');
  const functionFiles = fs.existsSync(functionsDir) 
    ? fs.readdirSync(functionsDir).filter(f => f.endsWith('.cjs'))
    : [];

  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    port: PORT,
    pid: process.pid,
    uptime: Math.floor(process.uptime()),
    functions: functionFiles.length,
    functionList: functionFiles,
    version: '4.1.0',
    functionsDir: functionsDir
  });
});

// 加载JavaScript函数
const functionsDir = path.join(__dirname, 'netlify', 'functions-js');
console.log(`[${new Date().toISOString()}] Looking for JS functions in: ${functionsDir}`);

if (fs.existsSync(functionsDir)) {
  const files = fs.readdirSync(functionsDir).filter(f => f.endsWith('.cjs'));
  console.log(`[${new Date().toISOString()}] Found ${files.length} CJS function files: ${files.join(', ')}`);

  files.forEach(file => {
    const functionName = file.replace('.cjs', '');
    const functionPath = path.join(functionsDir, file);
    
    app.all(`/.netlify/functions/${functionName}`, async (req, res) => {
      try {
        // 清除require缓存以支持热重载
        delete require.cache[require.resolve(functionPath)];
        const func = require(functionPath);
        
        // 构造事件对象
        const event = {
          httpMethod: req.method,
          queryStringParameters: req.query,
          body: req.method === 'POST' ? JSON.stringify(req.body) : null,
          headers: req.headers,
          path: req.path,
          pathParameters: req.params
        };
        
        const context = {};
        const result = await func.handler(event, context);
        
        // 设置响应头
        if (result.headers) {
          Object.keys(result.headers).forEach(key => {
            res.set(key, result.headers[key]);
          });
        }
        
        res.status(result.statusCode || 200).send(result.body);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Function ${functionName} error:`, error);
        res.status(500).json({ 
          error: 'Function execution failed', 
          function: functionName,
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    console.log(`[${new Date().toISOString()}] ✓ Registered function: /.netlify/functions/${functionName}`);
  });
} else {
  console.log(`[${new Date().toISOString()}] Functions directory not found: ${functionsDir}`);
}

// 启动服务器
app.listen(PORT, '0.0.0.0', (err) => {
  if (err) {
    console.error(`[${new Date().toISOString()}] Failed to start server:`, err);
    process.exit(1);
  }
  console.log(`[${new Date().toISOString()}] ✓ ProductMind Functions Server v4.1 running on port ${PORT}`);
  console.log(`[${new Date().toISOString()}] ✓ Health check: http://localhost:${PORT}/health`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});
EOF
echo "后端服务器创建完成。"

# --- 6. 创建PM2生态系统文件 ---
echo "--> 步骤 6/6: 创建PM2 ecosystem.config.cjs..."
cat > ecosystem.config.cjs << 'EOF'
// 加载.env文件
require('dotenv').config({ path: './.env' });

module.exports = {
  apps: [
    {
      name: 'netlify-functions',
      script: 'backend-server.cjs',
      cwd: '/home/productmindaidev',
      env: {
        NODE_ENV: 'production',
        PORT: 8888,
        // 明确指定Supabase环境变量
        VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'https://uobwbhvwrciaxloqdizc.supabase.co',
        VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
        VITE_SUPABASE_SERVICE_ROLE_KEY: process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
        // 其他API密钥
        VITE_DEFAULT_API_KEY: process.env.VITE_DEFAULT_API_KEY,
        VITE_PERPLEXITY_API_KEY: process.env.VITE_PERPLEXITY_API_KEY,
        DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        // AWS配置
        AWS_REGION: process.env.AWS_REGION,
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
        // 其他配置
        SERPER_API_KEY: process.env.SERPER_API_KEY,
        REDIS_URL: process.env.REDIS_URL,
        LOG_LEVEL: process.env.LOG_LEVEL,
        LOG_FILE: process.env.LOG_FILE
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8888,
        // 生产环境下的明确配置
        VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'https://uobwbhvwrciaxloqdizc.supabase.co',
        VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
        VITE_SUPABASE_SERVICE_ROLE_KEY: process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
      },
      error_file: '/home/productmindaidev/logs/functions-error.log',
      out_file: '/home/productmindaidev/logs/functions-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 4000,
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
};
EOF
echo "PM2配置创建完成。"

# --- 7. 创建日志目录并启动服务 ---
echo "--> 步骤 7/6: 创建日志目录并启动服务..."
mkdir -p logs
sudo chown -R ec2-user:ec2-user logs/

pm2 start ecosystem.config.cjs --env production || { echo "启动PM2失败，中止操作。"; exit 1; }
pm2 save
sleep 5

echo ""
echo "=== 部署验证 ==="
echo "PM2状态:"
pm2 list

echo ""
echo "环境变量检查:"
echo "VITE_SUPABASE_URL: $(echo $VITE_SUPABASE_URL | head -c 30)..."
echo "VITE_SUPABASE_ANON_KEY: $(echo $VITE_SUPABASE_ANON_KEY | head -c 20)..."

echo ""
echo "健康检查:"
curl -s http://localhost:8888/health || echo "Netlify函数服务器无响应"

echo ""
echo "测试函数:"
curl -s http://localhost:8888/.netlify/functions/get-categories | head -3 || echo "函数测试失败"

echo ""
echo "前端访问测试:"
curl -s -I http://localhost/ | head -3 || echo "前端访问失败"

echo ""
echo "=== 修正版部署完成 ==="
echo "前端: http://productmindai.com"
echo "健康检查: http://productmindai.com/health"
echo "函数服务: 端口8888"
echo ""
echo "如有问题，请检查日志: pm2 logs" 