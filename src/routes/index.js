const express = require('express');
const contactRoutes = require('./contactRoutes');
const companyRoutes = require('./companyRoutes');
const organizationRoutes = require('./organizationRoutes');
const path = require('path');

// 创建路由函数
function setupRoutes(app) {
  // API 路由
  app.use('/api/contacts', contactRoutes);
  app.use('/api/companies', companyRoutes);
  app.use('/api/organizations', organizationRoutes);
  
  // 提供前端页面
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../index.html'));
  });
  
  // 404 处理
  app.use((req, res) => {
    res.status(404).json({ error: '请求的资源不存在' });
  });
  
  // 全局错误处理
  app.use((err, req, res, next) => {
    console.error('错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  });
}

module.exports = setupRoutes; 