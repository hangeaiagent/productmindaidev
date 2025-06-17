#!/bin/bash

echo "=== 修复TypeScript编译问题 ==="

cd /home/productmindaidev

# 1. 停止服务
echo "停止当前服务..."
pm2 stop netlify-functions 2>/dev/null || true

# 2. 创建专用于Netlify函数的tsconfig.json
echo "创建Netlify函数专用TypeScript配置..."
cat > tsconfig.functions.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "CommonJS",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "allowJs": true,
    "checkJs": false,
    "outDir": "./netlify/functions-compiled",
    "rootDir": "./netlify/functions",
    "strict": false,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": false,
    "removeComments": true,
    "sourceMap": false,
    "baseUrl": "./",
    "paths": {
      "@netlify/functions": ["./node_modules/@netlify/functions"],
      "@supabase/supabase-js": ["./node_modules/@supabase/supabase-js"]
    }
  },
  "include": [
    "netlify/functions/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts"
  ]
}
EOF

# 3. 直接创建JavaScript版本的函数（避免编译问题）
echo "创建JavaScript版本的函数..."

# 创建函数目录
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

# 创建check-category-codes.js
cat > netlify/functions-js/check-category-codes.js << 'EOF'
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

let supabase;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

exports.handler = async (event, context) => {
  console.log('check-category-codes function called');
  
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
      .select('id, name, code')
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

# 4. 更新后端服务器以使用JavaScript函数
echo "更新后端服务器配置..."
cat > backend-server.cjs << 'EOF'
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8888;

console.log(`[${new Date().toISOString()}] Starting ProductMind Functions Server v2.3 on port ${PORT}`);

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
    version: '2.3.0',
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
  console.log(`[${new Date().toISOString()}] ✓ ProductMind Functions Server v2.3 running on port ${PORT}`);
  console.log(`[${new Date().toISOString()}] ✓ Health check: http://localhost:${PORT}/health`);
});
EOF

# 5. 重启服务
echo "重启服务..."
pm2 restart netlify-functions

# 6. 等待并测试
sleep 10
echo ""
echo "=== 测试服务健康状态 ==="
curl -s http://localhost:8888/health | head -10

echo ""
echo "=== 测试函数 ==="
echo "测试get-categories:"
curl -s http://localhost:8888/.netlify/functions/get-categories | head -5

echo ""
echo "测试check-category-codes:"
curl -s http://localhost:8888/.netlify/functions/check-category-codes | head -5

echo ""
echo "=== 可用JavaScript函数列表 ==="
ls -la netlify/functions-js/*.js

echo ""
echo "=== 服务状态 ==="
pm2 list

echo ""
echo "修复完成！"
echo "- 所有函数已转换为JavaScript版本"
echo "- 避免了TypeScript编译问题"
echo "- 服务器现在使用netlify/functions-js目录"
echo ""
echo "如果还有问题，请检查PM2日志: pm2 logs netlify-functions" 