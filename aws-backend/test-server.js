const express = require('express');
const app = express();
const PORT = 3000;

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'AWS Backend Test Server Running'
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'ProductMind AI AWS Backend Service - Test Mode',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 测试服务器启动成功！`);
  console.log(`📍 端口: ${PORT}`);
  console.log(`🔗 健康检查: http://localhost:${PORT}/health`);
});

module.exports = app; 