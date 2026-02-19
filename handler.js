// 请求处理器
import { AUTH_TOKEN } from './config.js';
import { sendReply, sendWelcomeMessage, downloadTelegramPhoto, isFileTooLarge } from './telegram.js';
import { callTencentOCR, parseOcrResult } from './ocr.js';
import { callLLMToAnalyze, formatTokenStats } from './ai.js';
import { streamToBase64 } from './utils.js';

/**
 * 处理 Telegram Webhook 请求
 * @param {Object} body - 请求体
 * @returns {Promise<void>}
 */
export async function handleTelegramWebhook(body) {
  const { message } = body;
  
  if (!message) {
    return;
  }
  
  const chatId = message.chat.id;
  
  // /start 命令
  if (message.text === '/start') {
    await sendWelcomeMessage(chatId);
    return;
  }
  
  // 图片 OCR + AI 结构化
  if (message.photo && message.photo.length > 0) {
    await handlePhotoOcrWithAI(chatId, message.photo);
    return;
  }
}

/**
 * 处理图片 OCR 和 AI 结构化流程
 * @param {number|string} chatId - 聊天 ID
 * @param {Array} photoArray - Telegram photo 数组
 */
async function handlePhotoOcrWithAI(chatId, photoArray) {
  await sendReply(chatId, '📤 Receiving and processing your image...');
  
  const bestPhoto = photoArray[photoArray.length - 1];
  
  // 检查文件大小
  if (isFileTooLarge(bestPhoto)) {
    await sendReply(chatId, '❌ Upload rejected: File size exceeds the 10MB limit.');
    return;
  }
  
  try {
    // 下载图片
    await sendReply(chatId, '🔐 Processing image...');
    const imageRes = await downloadTelegramPhoto(bestPhoto.file_id);
    const imageBase64 = await streamToBase64(imageRes.body);
    
    // OCR 识别
    await sendReply(chatId, '🔍 Performing OCR recognition...');
    const ocrResponse = await callTencentOCR(imageBase64);
    
    console.log('OCR Response:', JSON.stringify(ocrResponse));
    
    // 解析 OCR 结果
    const ocrText = parseOcrResult(ocrResponse);
    
    if (ocrText === 'No text detected in the image.') {
      await sendReply(chatId, '❌ No text detected in the image.');
      return;
    }

    // 打印 OCR 原始文本用于调试
    console.log('=== Raw OCR Result ===');
    console.log(ocrText);
    console.log('======================');
    
    // AI 结构化分析
    await sendReply(chatId, '🤖 AI is structuring the data...');
    
    let aiResult;
    try {
      aiResult = await callLLMToAnalyze(ocrText);
    } catch (aiError) {
      console.error('AI Error:', aiError);
      // AI 失败时返回 OCR 原始文本
      await sendReply(chatId, `✅ OCR Result:\n${ocrText}\n\n⚠️ AI analysis failed: ${aiError.message}`);
      return;
    }

    console.log('=== LLM Result ===');
    console.log(aiResult.text);
    
    // 发送 AI 分析结果（使用 Markdown 格式）
    const MAX = 4000;
    const finalMsg = aiResult.text.length > MAX 
      ? aiResult.text.slice(0, MAX) + '...(truncated)' 
      : aiResult.text;
    
    await sendReply(chatId, finalMsg, undefined, 'Markdown');
    
    // 发送 Token 统计（纯文本，避免 Markdown 解析问题）
    if (aiResult.usage) {
      const statsText = formatTokenStats(aiResult.usage);
      await sendReply(chatId, statsText);
    }
    
  } catch (error) {
    console.error('Processing Error:', error);
    const errorMessage = `Processing failed: ${error.message || String(error)}`;
    await sendReply(chatId, errorMessage);
  }
}

/**
 * 验证 Telegram Webhook Secret Token
 * @param {string} token - 请求头中的 token
 * @returns {boolean} 是否验证通过
 */
export function validateAuthToken(token) {
  return token === AUTH_TOKEN;
}
