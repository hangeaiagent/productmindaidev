const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8888;

console.log(`Starting ProductMind Functions Server v4.0 on port ${PORT}`);

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

// 健康检查
app.get('/health', (req, res) => {
  const functionsDir = path.join(__dirname, 'netlify', 'functions-js');
  const functionFiles = fs.existsSync(functionsDir) 
    ? fs.readdirSync(functionsDir).filter(f => f.endsWith('.js'))
    : [];

  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    port: PORT,
    pid: process.pid,
    uptime: Math.floor(process.uptime()),
    functions: functionFiles.length,
    functionList: functionFiles,
    version: '4.0.0',
    functionsDir: functionsDir
  });
});

// 加载JavaScript函数
const functionsDir = path.join(__dirname, 'netlify', 'functions-js');
console.log(`Looking for JS functions in: ${functionsDir}`);

if (fs.existsSync(functionsDir)) {
  const files = fs.readdirSync(functionsDir).filter(f => f.endsWith('.js'));
  console.log(`Found ${files.length} JS functions: ${files.join(', ')}`);
  
  files.forEach(file => {
    const functionName = file.replace('.js', '');
    const functionPath = path.join(functionsDir, file);
    
    console.log(`Loading function: ${functionName}`);
    
    app.all(`/.netlify/functions/${functionName}`, async (req, res) => {
      const startTime = Date.now();
      
      try {
        console.log(`Executing function: ${functionName} (${req.method})`);
        
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
          awsRequestId: Math.random().toString(36).substring(7),
          getRemainingTimeInMillis: () => 30000
        };
        
        // 执行函数
        const result = await func.handler(event, context);
        const duration = Date.now() - startTime;
        
        console.log(`Function ${functionName} completed in ${duration}ms, status: ${result?.statusCode || 'unknown'}`);
        
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
          res.json({ success: true, executionTime: duration });
        }
        
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`Error in function ${functionName} after ${duration}ms:`, error.message);
        
        res.status(500).json({ 
          error: 'Function execution failed',
          message: error.message,
          functionName: functionName,
          executionTime: duration
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
  console.error(`Server error:`, error.message);
  res.status(500).json({ error: 'Internal server error', message: error.message });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', (err) => {
  if (err) {
    console.error(`Failed to start server:`, err);
    process.exit(1);
  }
  console.log(`✓ ProductMind Functions Server v4.0 running on port ${PORT}`);
  console.log(`✓ Health check: http://localhost:${PORT}/health`);
}); 