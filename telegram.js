// Telegram Bot 服务
import { BOT_TOKEN } from './config.js';

/**
 * 发送消息到 Telegram 聊天
 * @param {number|string} chatId - 聊天 ID
 * @param {string} text - 消息文本
 * @param {Object} replyMarkup - 可选的回复键盘
 * @param {string} parseMode - 解析模式 ('Markdown', 'MarkdownV2', 'HTML')
 */
export async function sendReply(chatId, text, replyMarkup = undefined, parseMode = undefined) {
  if (!BOT_TOKEN) {
    throw new Error('Bot token not configured');
  }
  
  const body = {
    chat_id: chatId,
    text: text,
  };
  
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }
  
  if (parseMode) {
    body.parse_mode = parseMode;
  }
  
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const error = await response.json();
    console.error('Telegram API error:', error);
    throw new Error(`Telegram API error: ${error.description || 'Unknown'}`);
  }
}

/**
 * 发送欢迎消息（/start 命令响应）
 * @param {number|string} chatId - 聊天 ID
 */
export async function sendWelcomeMessage(chatId) {
  const inlineKeyboard = {
    inline_keyboard: [
      [{ text: '☀️ Weather App', web_app: { url: 'https://test-telegram-mini-apps-qsev.vercel.app/' } }],
      [{ text: '📝 Daily Report App', web_app: { url: 'https://daily-report-tg-mini-apps.vercel.app/' } }],
      [{ text: '📷 QR Code App', web_app: { url: 'https://tg-mini-app-qr-dev.vercel.app/' } }],
    ],
  };
  
  await sendReply(chatId, 'Welcome! Please choose an app:', inlineKeyboard);
}

/**
 * 从 Telegram 下载图片文件
 * @param {string} fileId - 文件 ID
 * @returns {Promise<Response>} 图片的 fetch Response
 */
export async function downloadTelegramPhoto(fileId) {
  if (!BOT_TOKEN) {
    throw new Error('Bot token not configured');
  }
  
  // 1. 获取文件信息
  const fileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
  const fileData = await fileRes.json();
  
  if (!fileData.ok) {
    throw new Error('Failed to retrieve file info from Telegram');
  }
  
  // 2. 下载图片
  const filePath = fileData.result.file_path;
  const imageRes = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`);
  
  if (!imageRes.body) {
    throw new Error('Failed to get image stream');
  }
  
  return imageRes;
}

/**
 * 检查文件大小是否超过限制
 * @param {Object} photo - Telegram photo 对象
 * @param {number} limitBytes - 限制大小（字节），默认 10MB
 * @returns {boolean} 是否超过限制
 */
export function isFileTooLarge(photo, limitBytes = 10 * 1024 * 1024) {
  return photo.file_size && photo.file_size > limitBytes;
}
