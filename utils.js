// 工具函数

/**
 * 将 ReadableStream 转换为 Base64 字符串
 * @param {ReadableStream} stream - 输入流
 * @returns {Promise<string>} Base64 编码的字符串
 */
export async function streamToBase64(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('base64');
}
