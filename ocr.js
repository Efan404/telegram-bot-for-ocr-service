// 腾讯云 OCR 服务
import { ocr } from 'tencentcloud-sdk-nodejs-ocr';
import { TENCENTCLOUD_SECRET_ID, TENCENTCLOUD_SECRET_KEY, TENCENTCLOUD_REGION } from './config.js';

const { Client } = ocr.v20181119;

// 腾讯云 OCR 客户端实例
let ocrClient = null;

/**
 * 获取 OCR 客户端实例（单例模式）
 * @returns {Client|null} OCR 客户端
 */
function getOcrClient() {
  if (ocrClient) return ocrClient;
  
  if (!TENCENTCLOUD_SECRET_ID || !TENCENTCLOUD_SECRET_KEY) {
    console.warn('Tencent Cloud credentials not configured');
    return null;
  }
  
  ocrClient = new Client({
    credential: {
      secretId: TENCENTCLOUD_SECRET_ID,
      secretKey: TENCENTCLOUD_SECRET_KEY,
    },
    region: TENCENTCLOUD_REGION,
    profile: {
      httpProfile: {
        endpoint: 'ocr.tencentcloudapi.com',
      },
    },
  });
  
  return ocrClient;
}

/**
 * 调用腾讯云 OCR 识别图片
 * @param {string} imageBase64 - 图片的 Base64 编码
 * @returns {Promise<Object>} OCR 识别结果
 */
export async function callTencentOCR(imageBase64) {
  const client = getOcrClient();
  
  if (!client) {
    throw new Error('Tencent Cloud credentials not configured');
  }
  
  const params = {
    ImageBase64: imageBase64,
    // 注意：GeneralAccurateOCR 不支持 Language 参数
  };
  
  return new Promise((resolve, reject) => {
    client.GeneralAccurateOCR(params, (err, response) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(response);
    });
  });
}

/**
 * 解析 OCR 响应，提取识别到的文本
 * @param {Object} ocrResponse - OCR API 响应
 * @returns {string} 识别到的文本，如果没有文本则返回提示信息
 */
export function parseOcrResult(ocrResponse) {
  if (ocrResponse.TextDetections && ocrResponse.TextDetections.length > 0) {
    const texts = ocrResponse.TextDetections
      .filter((item) => item.DetectedText)
      .map((item) => item.DetectedText)
      .join('\n');
    
    return texts || 'No text detected in the image.';
  }
  
  return 'No text detected in the image.';
}
