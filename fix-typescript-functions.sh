#!/bin/bash

echo "=== 修复TypeScript函数加载问题 ==="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 设置工作目录
cd /home/productmindaidev

log_info "当前工作目录: $(pwd)"

# 1. 停止服务
log_info "1. 停止Netlify函数服务..."
pm2 stop netlify-functions 2>/dev/null || true

# 2. 创建支持ES模块的后端服务器
log_info "2. 创建支持ES模块的后端服务器..."
cat > backend-server.cjs << 'EOF'
const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 8888;

console.log(`[${new Date().toISOString()}] Starting ProductMind Functions Server on port ${PORT}`);

// 中间件配置
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS配置
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
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// 健康检查端点
app.get('/health', (req, res) => {
  const functionsDir = path.join(__dirname, 'netlify', 'functions');
  const functionFiles = fs.existsSync(functionsDir) 
    ? fs.readdirSync(functionsDir).filter(f => f.endsWith('.js') || f.endsWith('.ts'))
    : [];

  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    port: PORT,
    pid: process.pid,
    uptime: process.uptime(),
    functions: functionFiles.length,
    functionList: functionFiles,
    memory: process.memoryUsage(),
    version: '2.0.0'
  });
});

// 系统信息端点
app.get('/system', (req, res) => {
  res.json({
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV || 'development'
  });
});

// 动态import函数，支持ES模块
async function loadFunction(functionPath) {
  try {
    // 清除require缓存
    const fullPath = path.resolve(functionPath);
    delete require.cache[fullPath];
    
    if (functionPath.endsWith('.ts')) {
      // 对于TypeScript文件，使用动态import
      const fileUrl = 'file://' + fullPath;
      const module = await import(fileUrl);
      return module;
    } else {
      // 对于JavaScript文件，先尝试require，失败则使用import
      try {
        return require(fullPath);
      } catch (error) {
        if (error.code === 'ERR_REQUIRE_ESM') {
          const fileUrl = 'file://' + fullPath;
          const module = await import(fileUrl);
          return module;
        }
        throw error;
      }
    }
  } catch (error) {
    console.error(`Failed to load function from ${functionPath}:`, error.message);
    throw error;
  }
}

// 编译TypeScript函数
function compileTypeScriptFunction(tsPath) {
  return new Promise((resolve, reject) => {
    const jsPath = tsPath.replace('.ts', '.js');
    
    // 使用tsc编译单个文件
    const tsc = spawn('npx', ['tsc', tsPath, '--outDir', path.dirname(tsPath), '--target', 'es2020', '--module', 'esnext', '--moduleResolution', 'node'], {
      stdio: 'pipe'
    });
    
    let output = '';
    let error = '';
    
    tsc.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    tsc.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    tsc.on('close', (code) => {
      if (code === 0) {
        resolve(jsPath);
      } else {
        reject(new Error(`TypeScript compilation failed: ${error}`));
      }
    });
  });
}

// 加载Netlify函数
const functionsDir = path.join(__dirname, 'netlify', 'functions');
console.log(`[${new Date().toISOString()}] Looking for functions in: ${functionsDir}`);

if (fs.existsSync(functionsDir)) {
  const files = fs.readdirSync(functionsDir);
  console.log(`[${new Date().toISOString()}] Found ${files.length} files: ${files.join(', ')}`);
  
  files.forEach(file => {
    if (file.endsWith('.js') || file.endsWith('.ts')) {
      const functionName = file.replace(/\.(js|ts)$/, '');
      const functionPath = path.join(functionsDir, file);
      
      console.log(`[${new Date().toISOString()}] Loading function: ${functionName}`);
      
      app.all(`/.netlify/functions/${functionName}`, async (req, res) => {
        const startTime = Date.now();
        
        try {
          console.log(`[${new Date().toISOString()}] Executing function: ${functionName} (${req.method})`);
          
          // 加载函数
          let func;
          
          if (file.endsWith('.ts')) {
            try {
              // 先尝试直接导入TypeScript文件
              func = await loadFunction(functionPath);
            } catch (tsError) {
              console.log(`[${new Date().toISOString()}] Direct TS import failed, trying compilation for ${functionName}`);
              try {
                // 如果直接导入失败，尝试编译后导入
                const compiledPath = await compileTypeScriptFunction(functionPath);
                func = await loadFunction(compiledPath);
              } catch (compileError) {
                console.error(`[${new Date().toISOString()}] Compilation failed for ${functionName}:`, compileError.message);
                return res.status(500).json({ 
                  error: 'Function compilation failed',
                  message: compileError.message,
                  functionName: functionName
                });
              }
            }
          } else {
            func = await loadFunction(functionPath);
          }
          
          if (!func || !func.handler) {
            console.error(`[${new Date().toISOString()}] No handler found in ${functionName}`);
            return res.status(500).json({ 
              error: 'No handler function found',
              functionName: functionName 
            });
          }
          
          // 构造Netlify事件对象
          const event = {
            httpMethod: req.method,
            path: req.path,
            queryStringParameters: req.query || {},
            headers: req.headers,
            body: req.method !== 'GET' ? JSON.stringify(req.body) : null,
            isBase64Encoded: false,
            requestContext: {
              requestId: Math.random().toString(36).substring(7),
              stage: 'prod',
              requestTime: new Date().toISOString(),
              identity: {
                sourceIp: req.ip
              }
            }
          };
          
          const context = {
            callbackWaitsForEmptyEventLoop: false,
            functionName: functionName,
            functionVersion: '$LATEST',
            awsRequestId: Math.random().toString(36).substring(7),
            requestId: Math.random().toString(36).substring(7)
          };
          
          // 执行函数
          const result = await func.handler(event, context);
          const duration = Date.now() - startTime;
          
          console.log(`[${new Date().toISOString()}] Function ${functionName} completed in ${duration}ms, status: ${result?.statusCode || 'unknown'}`);
          
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
          console.error(`[${new Date().toISOString()}] Error in function ${functionName} after ${duration}ms:`, error.message);
          console.error('Stack trace:', error.stack);
          
          res.status(500).json({ 
            error: 'Function execution failed',
            message: error.message,
            functionName: functionName,
            executionTime: duration
          });
        }
      });
      
      console.log(`[${new Date().toISOString()}] ✓ Registered function: /.netlify/functions/${functionName}`);
    }
  });
} else {
  console.log(`[${new Date().toISOString()}] Functions directory not found: ${functionsDir}`);
}

// 404处理
app.use((req, res) => {
  console.log(`[${new Date().toISOString()}] 404: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: 'Not found', 
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// 全局错误处理
app.use((error, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Server error:`, error.message);
  console.error('Stack trace:', error.stack);
  
  res.status(500).json({ 
    error: 'Internal server error', 
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// 启动服务器
const server = app.listen(PORT, '0.0.0.0', (err) => {
  if (err) {
    console.error(`[${new Date().toISOString()}] Failed to start server:`, err);
    process.exit(1);
  }
  console.log(`[${new Date().toISOString()}] ✓ ProductMind Functions Server v2.0 running on port ${PORT}`);
  console.log(`[${new Date().toISOString()}] ✓ Health check: http://localhost:${PORT}/health`);
  console.log(`[${new Date().toISOString()}] ✓ System info: http://localhost:${PORT}/system`);
});

// 优雅关闭
const gracefulShutdown = (signal) => {
  console.log(`[${new Date().toISOString()}] Received ${signal}, shutting down gracefully`);
  server.close(() => {
    console.log(`[${new Date().toISOString()}] Server closed`);
    process.exit(0);
  });
  
  // 强制关闭（10秒后）
  setTimeout(() => {
    console.log(`[${new Date().toISOString()}] Force shutdown`);
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 未捕获异常处理
process.on('uncaughtException', (error) => {
  console.error(`[${new Date().toISOString()}] Uncaught Exception:`, error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`[${new Date().toISOString()}] Unhandled Rejection at:`, promise, 'reason:', reason);
});
EOF

# 3. 安装TypeScript编译器（如果没有）
log_info "3. 确保TypeScript编译器可用..."
npm install -g typescript || log_warn "TypeScript全局安装失败，尝试本地安装"
npm install --save-dev typescript

# 4. 重启Netlify函数服务
log_info "4. 重启Netlify函数服务..."
pm2 restart netlify-functions

# 5. 等待服务启动
log_info "5. 等待服务启动..."
sleep 10

# 6. 测试服务
log_info "6. 测试服务..."
echo "=== 健康检查 ==="
curl -s http://localhost:8888/health | head -10

echo ""
echo "=== 测试TypeScript函数 ==="
curl -s http://localhost:8888/.netlify/functions/get-categories | head -5

# 7. 显示最新日志
log_info "7. 显示最新日志..."
pm2 logs netlify-functions --lines 20

log_info "=== 修复完成 ==="
echo "如果还有问题，请检查："
echo "1. TypeScript函数语法是否正确"
echo "2. 函数是否正确导出handler"
echo "3. 查看详细日志: pm2 logs netlify-functions" 