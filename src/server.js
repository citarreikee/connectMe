const express = require('express');
const path = require('path');
const { loadData } = require('./models');
const setupRoutes = require('./routes');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// 初始化数据
function initializeData() {
  console.log('正在初始化数据...');
  try {
    // 加载数据
    loadData();
    console.log('数据初始化完成');
  } catch (error) {
    console.error('数据初始化失败:', error);
  }
}

// 中间件
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, '..')));
app.use(logger);

// 设置路由
setupRoutes(app);

// 错误处理中间件（必须在路由之后）
app.use(errorHandler);

// 启动服务器
function startServer() {
  app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
    console.log(`访问 http://localhost:${PORT} 查看应用`);
    
    // 初始化数据
    initializeData();
  });
}

// 如果这个文件被直接运行
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer }; 