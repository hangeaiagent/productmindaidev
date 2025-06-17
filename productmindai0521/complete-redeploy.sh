#!/bin/bash

echo "=== ProductMind 完整重新部署 ==="

cd /home/productmindaidev

# 1. 停止所有服务
echo "停止所有服务..."
pm2 stop all
pm2 delete all
sudo pkill -f "node.*backend-server"
sudo pkill -f "node.*8888"
sudo pkill -f "node.*3000"

# 2. 清理端口
echo "清理端口..."
sudo netstat -tlnp | grep :8888 | awk '{print $7}' | cut -d'/' -f1 | xargs -r sudo kill -9
sudo netstat -tlnp | grep :3000 | awk '{print $7}' | cut -d'/' -f1 | xargs -r sudo kill -9
sudo netstat -tlnp | grep :5173 | awk '{print $7}' | cut -d'/' -f1 | xargs -r sudo kill -9

# 3. 更新代码
echo "更新代码..."
npm install

# 4. 构建前端
echo "构建前端..."
npm run build
sudo cp -r dist/* /var/www/html/

# 5. 确保JavaScript函数存在
echo "创建JavaScript函数..."
mkdir -p netlify/functions-js

# 创建get-categories.js
cat > netlify/functions-js/get-categories.js << 'EOF'
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

let supabase;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

exports.handler = async (event, context) => {
  console.log('get-categories function called');
  
  try {
    if (!supabase) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Database not configured' })
      };
    }

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Supabase error:', error);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: error.message })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(data || [])
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
EOF

# 创建get-projects-by-category.js
cat > netlify/functions-js/get-projects-by-category.js << 'EOF'
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

let supabase;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

exports.handler = async (event, context) => {
  console.log('get-projects-by-category function called');
  
  try {
    if (!supabase) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Database not configured' })
      };
    }

    const categoryId = event.queryStringParameters?.category;
    const page = parseInt(event.queryStringParameters?.page || '1');
    const limit = parseInt(event.queryStringParameters?.limit || '20');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('projects')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: error.message })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        data: data || [],
        total: count || 0,
        page: page,
        limit: limit
      })
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
EOF

# 6. 创建/更新后端服务器
echo "创建后端服务器..."
cat > backend-server.cjs << 'EOF'
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8888;

console.log(`[${new Date().toISOString()}] Starting ProductMind Functions Server v3.0 on port ${PORT}`);

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
    version: '3.0.0',
    functionsDir: functionsDir
  });
});

// 加载JavaScript函数
const functionsDir = path.join(__dirname, 'netlify', 'functions-js');
console.log(`[${new Date().toISOString()}] Looking for JS functions in: ${functionsDir}`);

if (fs.existsSync(functionsDir)) {
  const files = fs.readdirSync(functionsDir).filter(f => f.endsWith('.js'));
  console.log(`[${new Date().toISOString()}] Found ${files.length} JS functions: ${files.join(', ')}`);
  
  files.forEach(file => {
    const functionName = file.replace('.js', '');
    const functionPath = path.join(functionsDir, file);
    
    console.log(`[${new Date().toISOString()}] Loading function: ${functionName}`);
    
    app.all(`/.netlify/functions/${functionName}`, async (req, res) => {
      const startTime = Date.now();
      
      try {
        console.log(`[${new Date().toISOString()}] Executing function: ${functionName} (${req.method})`);
        
        // 清除缓存
        delete require.cache[require.resolve(path.resolve(functionPath))];
        
        // 加载函数
        const func = require(path.resolve(functionPath));
        
        if (!func || !func.handler) {
          console.error(`[${new Date().toISOString()}] No handler found in ${functionName}`);
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
        
        res.status(500).json({ 
          error: 'Function execution failed',
          message: error.message,
          functionName: functionName,
          executionTime: duration
        });
      }
    });
    
    console.log(`[${new Date().toISOString()}] ✓ Registered function: /.netlify/functions/${functionName}`);
  });
} else {
  console.log(`[${new Date().toISOString()}] Functions directory not found: ${functionsDir}`);
}

// 404和错误处理
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

app.use((error, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Server error:`, error.message);
  res.status(500).json({ error: 'Internal server error', message: error.message });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', (err) => {
  if (err) {
    console.error(`[${new Date().toISOString()}] Failed to start server:`, err);
    process.exit(1);
  }
  console.log(`[${new Date().toISOString()}] ✓ ProductMind Functions Server v3.0 running on port ${PORT}`);
  console.log(`[${new Date().toISOString()}] ✓ Health check: http://localhost:${PORT}/health`);
});
EOF

# 7. 创建AWS后端服务器
echo "创建AWS后端服务器..."
cat > aws-backend-server.cjs << 'EOF'
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.AWS_BACKEND_PORT || 3000;

console.log(`[${new Date().toISOString()}] Starting AWS Backend Server on port ${PORT}`);

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'aws-backend',
    timestamp: new Date().toISOString(),
    port: PORT,
    pid: process.pid,
    uptime: Math.floor(process.uptime())
  });
});

// API路由
app.get('/api/status', (req, res) => {
  res.json({ status: 'AWS Backend API is running' });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', (err) => {
  if (err) {
    console.error(`[${new Date().toISOString()}] Failed to start AWS backend:`, err);
    process.exit(1);
  }
  console.log(`[${new Date().toISOString()}] ✓ AWS Backend Server running on port ${PORT}`);
});
EOF

# 8. 创建PM2配置
echo "创建PM2配置..."
cat > ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'netlify-functions',
    script: './backend-server.cjs',
    env: {
      PORT: 8888,
      NODE_ENV: 'production'
    },
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/netlify-functions-error.log',
    out_file: './logs/netlify-functions-out.log',
    log_file: './logs/netlify-functions-combined.log',
    time: true
  }, {
    name: 'aws-backend',
    script: './aws-backend-server.cjs',
    env: {
      AWS_BACKEND_PORT: 3000,
      NODE_ENV: 'production'
    },
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '512M',
    error_file: './logs/aws-backend-error.log',
    out_file: './logs/aws-backend-out.log',
    log_file: './logs/aws-backend-combined.log',
    time: true
  }]
};
EOF

# 9. 创建日志目录
mkdir -p logs

# 10. 启动服务
echo "启动服务..."
pm2 start ecosystem.config.cjs

# 11. 重新加载nginx
echo "重新加载nginx..."
sudo nginx -t && sudo systemctl reload nginx

# 12. 等待服务启动
sleep 10

# 13. 验证部署
echo ""
echo "=== 部署验证 ==="
echo "PM2状态:"
pm2 list

echo ""
echo "健康检查:"
curl -s http://localhost:8888/health || echo "Netlify函数服务器无响应"
curl -s http://localhost:3000/health || echo "AWS后端服务器无响应"

echo ""
echo "测试函数:"
curl -s http://localhost:8888/.netlify/functions/get-categories | head -3 || echo "函数测试失败"

echo ""
echo "前端访问测试:"
curl -s -I http://localhost/ | head -3 || echo "前端访问失败"

echo ""
echo "=== 部署完成 ==="
echo "前端: http://productmindai.com"
echo "健康检查: http://productmindai.com/health"
echo "函数服务: 端口8888"
echo "AWS后端: 端口3000"
echo ""
echo "如有问题，请检查日志: pm2 logs" 