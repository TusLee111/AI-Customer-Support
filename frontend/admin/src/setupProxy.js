// Đã được rename thành setupProxy.bak.js để vô hiệu hóa proxy.
const { createProxyMiddleware } = require('http-proxy-middleware');
console.log('setupProxy loaded!');
module.exports = function(app) {
  console.log('✅ Proxy middleware attached');
  // Proxy API requests - giữ nguyên path /api
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8000',
      changeOrigin: true,
      ws: true,
      logLevel: 'debug',
      // KHÔNG dùng pathRewrite để giữ nguyên /api
    })
  );

  // Proxy Socket.IO requests
  app.use(
    '/socket.io',
    createProxyMiddleware({
      target: 'http://localhost:8000',
      changeOrigin: true,
      ws: true,
      logLevel: 'debug',
    })
  );

}; 