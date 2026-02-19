// 配置和环境变量

// 服务器配置
export const PORT = process.env.PORT || 8000;

// Telegram Bot 配置
export const BOT_TOKEN = process.env.TEST_BOT_TOKEN;
export const AUTH_TOKEN = process.env.TG_TEST_BOTS_AUTH_TOKEN;

// 腾讯云 OCR 配置
export const TENCENTCLOUD_SECRET_ID = process.env.TENCENTCLOUD_SECRET_ID;
export const TENCENTCLOUD_SECRET_KEY = process.env.TENCENTCLOUD_SECRET_KEY;
export const TENCENTCLOUD_REGION = process.env.TENCENTCLOUD_REGION || 'ap-guangzhou';

// AI LLM 配置 (OpenAI 兼容)
export const AI_BASE_URL = process.env.AI_BASE_URL;  // e.g., https://api.qnaigc.com/v1
export const AI_API_KEY = process.env.AI_API_KEY;
export const LLM_MODEL = process.env.LLM_MODEL || 'deepseek/deepseek-v3.2-251201';
