const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 8888;

app.use(cors());
app.use(express.json());

// 导入functions-js脚本
const getCategories = require('./netlify/functions-js/get-categories.cjs');
const getProjectsByCategory = require('./netlify/functions-js/get-projects-by-category.cjs');
const checkCategoryCodes = require('./netlify/functions-js/check-category-codes.cjs');

// 设置路由
app.get('/.netlify/functions/get-categories', async (req, res) => {
    try {
        console.log('📊 调用 get-categories 函数');
        const result = await getCategories.handler({
            httpMethod: 'GET',
            queryStringParameters: req.query,
            headers: req.headers
        });
        
        res.status(result.statusCode || 200);
        if (result.headers) {
            Object.keys(result.headers).forEach(key => {
                res.set(key, result.headers[key]);
            });
        }
        res.send(result.body);
    } catch (error) {
        console.error('❌ get-categories 错误:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/.netlify/functions/get-projects-by-category', async (req, res) => {
    try {
        console.log('📊 调用 get-projects-by-category 函数');
        const result = await getProjectsByCategory.handler({
            httpMethod: 'GET',
            queryStringParameters: req.query,
            headers: req.headers
        });
        
        res.status(result.statusCode || 200);
        if (result.headers) {
            Object.keys(result.headers).forEach(key => {
                res.set(key, result.headers[key]);
            });
        }
        res.send(result.body);
    } catch (error) {
        console.error('❌ get-projects-by-category 错误:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/.netlify/functions/check-category-codes', async (req, res) => {
    try {
        console.log('📊 调用 check-category-codes 函数');
        const result = await checkCategoryCodes.handler({
            httpMethod: 'GET',
            queryStringParameters: req.query,
            headers: req.headers
        });
        
        res.status(result.statusCode || 200);
        if (result.headers) {
            Object.keys(result.headers).forEach(key => {
                res.set(key, result.headers[key]);
            });
        }
        res.send(result.body);
    } catch (error) {
        console.error('❌ check-category-codes 错误:', error);
        res.status(500).json({ error: error.message });
    }
});

// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 Functions服务器运行在端口 ${PORT}`);
    console.log(`📊 可用端点:`);
    console.log(`   - GET /.netlify/functions/get-categories`);
    console.log(`   - GET /.netlify/functions/get-projects-by-category`);
    console.log(`   - GET /.netlify/functions/check-category-codes`);
    console.log(`   - GET /health`);
}); 