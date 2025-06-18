#!/bin/bash
# ProductMind AI - 安全部署脚本 (避免与AWS后台任务冲突)
# 只停止前端相关服务，保护正在运行的AWS后台生成任务

echo "=== [ProductMind AI] 启动安全部署脚本... ==="

# 确保在项目根目录运行
cd /home/productmindaidev || { echo "无法进入项目目录，中止操作。"; exit 1; }

# --- 1. 智能停止服务（保护AWS后台任务）---
echo "--> 步骤 1/6: 智能停止服务（保护AWS后台任务）..."

# 检查是否有正在运行的批量生成任务
BATCH_PROCESSES=$(ps aux | grep -E "(continuous_batch|batch-generate|aws-backend)" | grep -v grep | wc -l)
if [ $BATCH_PROCESSES -gt 0 ]; then
    echo "⚠️  检测到正在运行的AWS后台任务，将保护这些进程..."
    ps aux | grep -E "(continuous_batch|batch-generate|aws-backend)" | grep -v grep
    echo ""
    
    # 只停止前端相关的PM2服务
    pm2 stop netlify-functions || echo "netlify-functions未运行"
    pm2 delete netlify-functions || echo "netlify-functions不存在"
    
    # 不停止AWS后台相关的进程
    echo "✅ AWS后台任务已保护，继续部署前端服务..."
else
    echo "未检测到AWS后台任务，可以安全停止所有服务"
    pm2 stop all || echo "PM2服务未运行，跳过停止。"
    pm2 delete all || echo "PM2无服务可删除，跳过删除。"
fi

# 清理可能的僵尸进程（排除AWS后台）
sudo pkill -f "node.*backend-server" || true
echo "前端服务已清理。"

# --- 2. 修正权限并安装依赖 ---
echo "--> 步骤 2/6: 修正文件权限并安装依赖..."
sudo chown -R ec2-user:ec2-user /home/productmindaidev
npm install || { echo "依赖安装失败，中止操作。"; exit 1; }
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

# --- 5. 创建前端服务器（如果不存在或需要更新）---
echo "--> 步骤 5/6: 创建/更新前端服务器..."
cat > backend-server.cjs << 'EOF'
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8888;

console.log(`[${new Date().toISOString()}] Starting ProductMind Functions Server v4.2 on port ${PORT}`);

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
    version: '4.2.0-safe',
    functionsDir: functionsDir,
    awsBackendProtected: true
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
        delete require.cache[require.resolve(functionPath)];
        const func = require(functionPath);
        
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
  console.log(`[${new Date().toISOString()}] ✓ ProductMind Functions Server v4.2 running on port ${PORT}`);
  console.log(`[${new Date().toISOString()}] ✓ Health check: http://localhost:${PORT}/health`);
  console.log(`[${new Date().toISOString()}] ✓ AWS Backend tasks protected`);
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
echo "前端服务器创建完成。"

# --- 6. 创建安全的PM2生态系统文件 ---
echo "--> 步骤 6/6: 创建安全的PM2 ecosystem.config.cjs..."
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
      error_file: 'logs/frontend-error.log',
      out_file: 'logs/frontend-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      autorestart: true,
      restart_delay: 5000
    }
  ]
};
EOF

# --- 7. 启动前端服务 ---
echo "--> 步骤 7/7: 启动前端服务..."
pm2 start ecosystem.config.cjs || { echo "前端服务启动失败"; exit 1; }

# --- 8. 验证部署结果 ---
echo "--> 验证部署结果..."
sleep 5

# 检查前端服务
if curl -s http://localhost:8888/health > /dev/null; then
    echo "✅ 前端服务部署成功！"
else
    echo "⚠️  前端服务可能未完全启动，请检查日志"
fi

# 检查AWS后台任务状态
echo ""
echo "📊 AWS后台任务状态:"
BATCH_PROCESSES_AFTER=$(ps aux | grep -E "(continuous_batch|batch-generate|aws-backend)" | grep -v grep)
if [ -n "$BATCH_PROCESSES_AFTER" ]; then
    echo "$BATCH_PROCESSES_AFTER"
    echo "✅ AWS后台任务已保护并继续运行"
else
    echo "ℹ️  未检测到AWS后台任务"
fi

echo ""
echo "📋 PM2服务状态:"
pm2 status

echo ""
echo "🎉 安全部署完成！"
echo "✅ 前端服务: http://localhost:8888"
echo "✅ AWS后台任务已保护"
echo ""
echo "📝 查看日志:"
echo "pm2 logs netlify-functions  # 前端日志"
echo "tail -f aws-backend/logs/combined.log  # AWS后台日志" 