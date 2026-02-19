// 主入口文件
import http from 'http';
import { PORT } from './config.js';
import { handleTelegramWebhook, validateAuthToken } from './handler.js';

/**
 * HTTP 请求处理器
 * @param {http.IncomingMessage} req - 请求对象
 * @param {http.ServerResponse} res - 响应对象
 */
async function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  // 健康检查端点
  if (url.pathname === '/health') {
    res.writeHead(200);
    res.end('OK');
    return;
  }
  
  // 只处理 POST 请求
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end('Method Not Allowed');
    return;
  }
  
  try {
    // 验证 Secret Token
    const secretToken = req.headers['x-telegram-bot-api-secret-token'];
    if (!validateAuthToken(secretToken)) {
      res.writeHead(401);
      res.end('Unauthorized');
      return;
    }
    
    // 解析请求体
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString());
    
    // 处理请求
    await handleTelegramWebhook(body);
    
    // 返回成功
    res.writeHead(200);
    res.end('ok');
    
  } catch (err) {
    console.error('Request handler error:', err);
    // 即使出错也返回 200，避免 Telegram 重试
    res.writeHead(200);
    res.end('error');
  }
}

// 创建并启动服务器
const server = http.createServer(handleRequest);
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
