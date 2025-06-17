#!/bin/bash

echo "=== 简化修复TypeScript函数问题 ==="

cd /home/productmindaidev

# 1. 停止服务
pm2 stop netlify-functions 2>/dev/null || true

# 2. 方案1：编译所有TypeScript函数为JavaScript
echo "编译TypeScript函数..."
cd netlify/functions

for file in *.ts; do
    if [ -f "$file" ]; then
        echo "编译 $file"
        npx tsc "$file" --target es2020 --module esnext --outDir ./ --allowJs --skipLibCheck || echo "编译 $file 失败"
    fi
done

cd ../..

# 3. 创建简化的后端服务器
echo "创建简化后端服务器..."
cat > backend-server.cjs << 'EOF'
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8888;

console.log(`[${new Date().toISOString()}] Starting Simple Functions Server on port ${PORT}`);

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
  const functionsDir = path.join(__dirname, 'netlify', 'functions');
  const functionFiles = fs.existsSync(functionsDir) 
    ? fs.readdirSync(functionsDir).filter(f => f.endsWith('.js'))
    : [];

  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    port: PORT,
    pid: process.pid,
    functions: functionFiles.length,
    functionList: functionFiles,
    version: '2.1.0'
  });
});

// 加载函数（只处理JS文件）
const functionsDir = path.join(__dirname, 'netlify', 'functions');
console.log(`Looking for JS functions in: ${functionsDir}`);

if (fs.existsSync(functionsDir)) {
  const files = fs.readdirSync(functionsDir).filter(f => f.endsWith('.js'));
  console.log(`Found ${files.length} JS files: ${files.join(', ')}`);
  
  files.forEach(file => {
    const functionName = file.replace('.js', '');
    const functionPath = path.join(functionsDir, file);
    
    console.log(`Loading function: ${functionName}`);
    
    app.all(`/.netlify/functions/${functionName}`, async (req, res) => {
      const startTime = Date.now();
      
      try {
        console.log(`Executing function: ${functionName}`);
        
        // 清除缓存
        delete require.cache[require.resolve(path.resolve(functionPath))];
        
        // 加载函数
        const func = require(path.resolve(functionPath));
        
        if (!func || !func.handler) {
          console.error(`No handler found in ${functionName}`);
          return res.status(500).json({ 
            error: 'No handler function found',
            functionName: functionName 
          });
        }
        
        // 构造事件
        const event = {
          httpMethod: req.method,
          path: req.path,
          queryStringParameters: req.query || {},
          headers: req.headers,
          body: req.method !== 'GET' ? JSON.stringify(req.body) : null,
          isBase64Encoded: false
        };
        
        const context = {
          callbackWaitsForEmptyEventLoop: false,
          functionName: functionName,
          awsRequestId: Math.random().toString(36).substring(7)
        };
        
        // 执行函数
        const result = await func.handler(event, context);
        const duration = Date.now() - startTime;
        
        console.log(`Function ${functionName} completed in ${duration}ms`);
        
        // 发送响应
        const statusCode = result?.statusCode || 200;
        res.status(statusCode);
        
        if (result?.headers) {
          Object.keys(result.headers).forEach(key => {
            res.set(key, result.headers[key]);
          });
        }
        
        if (!res.get('Content-Type')) {
          res.set('Content-Type', 'application/json');
        }
        
        if (result?.body) {
          res.send(result.body);
        } else {
          res.json({ success: true });
        }
        
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`Error in function ${functionName}:`, error.message);
        
        res.status(500).json({ 
          error: 'Function execution failed',
          message: error.message,
          functionName: functionName
        });
      }
    });
    
    console.log(`✓ Registered function: /.netlify/functions/${functionName}`);
  });
} else {
  console.log(`Functions directory not found: ${functionsDir}`);
}

// 404和错误处理
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error', message: error.message });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', (err) => {
  if (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
  console.log(`✓ Simple Functions Server running on port ${PORT}`);
});
EOF

# 4. 重启服务
echo "重启服务..."
pm2 restart netlify-functions

# 5. 等待并测试
sleep 10
echo "测试服务..."
curl -s http://localhost:8888/health
echo ""
curl -s http://localhost:8888/.netlify/functions/get-categories

echo "修复完成！"
echo "如果还有问题，检查编译后的JS文件：ls -la netlify/functions/*.js" 