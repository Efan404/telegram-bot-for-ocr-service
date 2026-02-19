// AI 服务 - 结构化收据数据
import { AI_BASE_URL, AI_API_KEY, LLM_MODEL } from './config.js';

/**
 * 调用 LLM 分析 OCR 文本，提取结构化收据数据
 * @param {string} ocrText - OCR 识别到的原始文本
 * @returns {Promise<Object>} 分析结果和 Token 使用情况
 */
export async function callLLMToAnalyze(ocrText) {
  if (!AI_BASE_URL || !AI_API_KEY) {
    throw new Error('AI API not configured');
  }

  // 1. 获取当前日期 (用于辅助 AI 判断年份和校验日期合理性)
  const today = new Date().toISOString().split('T')[0]; // e.g., "2026-01-27"

  // 2. 设计带有显式推理步骤的 Prompt（包含严格的输出格式要求）
  const systemPrompt = `
You are an expert OCR Data Extraction Auditor. Your goal is to extract precise structured data from receipts/invoices.

**Current Server Date:** ${today} (YYYY-MM-DD)
*Use this date to infer the year if missing, or to validate that the transaction date is not in the distant future.*

**CRITICAL: Your output format is STRICT. Follow these rules:**

1. **DO NOT include** any "Context Analysis", "Reasoning", "Step-by-step", or explanatory sections.
2. **ONLY output** the final result in the exact format below.
3. **NO introductory text** like "Here is the analysis" or "Based on the OCR".
4. **NO JSON output**.

**Analysis Rules (do this internally, but DO NOT write it in output):**
- **Region & Country**: Analyze currency symbols (¥=JP, $=US/SG/HK, €=EU), phone codes, language.
  - Japan (JP): Yen (¥), Japanese text, "+81"
  - China (CN): Simplified Chinese, "+86"
  - Korea (KR): Hangul, Won (₩), "+82"
  - Singapore (SG): SGD, English + Chinese
  
- **Date Format Rules** (critical - do this in your head only):
  - **Japan/China/Korea**: YY/MM/DD = 20YY-MM-DD (Big-Endian)
    - Example: "26/01/22" in Japan = 2026-01-22
  - **Singapore/UK/HK**: DD/MM/YY = 20YY-MM-DD (Little-Endian)
    - Example: "26/01/22" in UK = 2022-01-26
  - **USA**: MM/DD/YY = 20YY-MM-DD (Middle-Endian)

- **Store Name**: The most prominent header text
- **Items**: List key purchases with prices
- **Total**: Final amount with 3-letter currency code (JPY, SGD, USD, CNY, etc.)

**OUTPUT FORMAT (exactly this, nothing else):**

🤖 AI is structuring the data...

*Receipt Summary*
*Store*: [Store Name]
*Country*: [XX]
*Date*: [YYYY-MM-DD]
-------------------
[Item 1]   [Price 1]
[Item 2]   [Price 2]
-------------------
*Total*: [CURRENCY] [AMOUNT]
`;

  try {
    const res = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stream: false,
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Extract data from this receipt OCR text:\n\n${ocrText}` 
          },
        ],
        temperature: 0.1, 
      }),
    });

    const data = await res.json();
    
    if (data.error) {
      console.error('LLM API Error Details:', data.error);
      throw new Error(data.error.message || 'LLM API returned an error');
    }

    const content = data.choices?.[0]?.message?.content;
    const usage = data.usage;

    // 清理 AI 输出：移除 Context Analysis 等不需要的部分
    const cleanedContent = cleanAIOutput(content || '⚠️ AI could not analyze the text.');

    return { 
      text: cleanedContent, 
      usage: usage 
    };
  } catch (error) {
    console.error('Call LLM Failed:', error);
    throw error;
  }
}

/**
 * 清理 AI 输出，移除 Context Analysis 等多余内容
 * @param {string} text - AI 原始输出
 * @returns {string} 清理后的文本
 */
function cleanAIOutput(text) {
  if (!text) return '';
  
  // 查找 "Context Analysis:" 或类似标记，移除之后的内容（如果它在 Receipt Summary 之后）
  const summaryIndex = text.indexOf('*Receipt Summary*');
  if (summaryIndex > 0) {
    // 只保留 Receipt Summary 及之前的内容（去掉前面的分析）
    text = text.substring(summaryIndex);
  }
  
  // 移除 Context Analysis 部分
  const patternsToRemove = [
    /\*\*Context Analysis:?\*\*?[\s\S]*$/i,  // 移除 Context Analysis 及之后所有内容
    /Context Analysis:?[\s\S]*$/i,           // 同上，不带星号
    /\*\*Step \d+:.*?\*\*[\s\S]*/i,          // 移除 Step X 及之后
    /Step \d+:.*?Analysis[\s\S]*/i,          // 移除 Step X Analysis
    /\*\*Reasoning:?\*\*?[\s\S]*$/i,         // 移除 Reasoning
    /Reasoning:?[\s\S]*$/i,                 // 同上
  ];
  
  for (const pattern of patternsToRemove) {
    text = text.replace(pattern, '');
  }
  
  // 清理多余的空行
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  
  return text;
}

/**
 * 格式化 Token 统计信息（使用 MarkdownV2 兼容格式）
 * @param {Object} usage - Token 使用情况
 * @returns {string} 格式化后的统计文本
 */
export function formatTokenStats(usage) {
  if (!usage) return '';
  
  const inputTokens = usage.prompt_tokens || usage.input_tokens || 0;
  const outputTokens = usage.completion_tokens || usage.output_tokens || 0;
  
  // DeepSeek-V3.2 / V3 价格
  // Input: $0.28 / 1M, Output: $0.42 / 1M
  const inputCost = (inputTokens / 1_000_000) * 0.28;
  const outputCost = (outputTokens / 1_000_000) * 0.42;
  const totalCost = inputCost + outputCost;
  
  // 使用简单的 Markdown，避免特殊字符问题
  return `📊 Token Usage & Cost
Input: ${inputTokens} | Output: ${outputTokens}
💰 Cost: $${totalCost.toFixed(6)}`;
}
