import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const PORT = parseInt(Deno.env.get('PORT') || '8000')
const BOT_TOKEN = Deno.env.get('TEST_BOT_TOKEN')!
const AUTH_TOKEN = Deno.env.get('TG_TEST_BOTS_AUTH_TOKEN')!

const TENCENTCLOUD_SECRET_ID = Deno.env.get('TENCENTCLOUD_SECRET_ID')
const TENCENTCLOUD_SECRET_KEY = Deno.env.get('TENCENTCLOUD_SECRET_KEY')
const TENCENTCLOUD_REGION = Deno.env.get('TENCENTCLOUD_REGION') || 'ap-guangzhou'

async function streamToBase64(stream: ReadableStream<Uint8Array>): Promise<string> {
  const chunks: Uint8Array[] = []
  const reader = stream.getReader()
  
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  
  const binary = result.reduce((acc, byte) => acc + String.fromCharCode(byte), '')
  return btoa(binary)
}

async function sha256(message: string, secret: string = ""): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  return await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message))
}

function getHash(message: string): string {
  return Array.from(
    new Uint8Array(
      crypto.createHash("sha256").update(new TextEncoder().encode(message)).digest()
    )
  ).map(b => b.toString(16).padStart(2, '0')).join('')
}

function getDate(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const year = date.getUTCFullYear()
  const month = ("0" + (date.getUTCMonth() + 1)).slice(-2)
  const day = ("0" + date.getUTCDate()).slice(-2)
  return `${year}-${month}-${day}`
}

async function callTencentOCRWithBase64(imageBase64: string): Promise<any> {
  if (!TENCENTCLOUD_SECRET_ID || !TENCENTCLOUD_SECRET_KEY) {
    throw new Error("Tencent Cloud credentials not configured")
  }

  const host = "ocr.tencentcloudapi.com"
  const service = "ocr"
  const timestamp = Math.floor(Date.now() / 1000)
  const date = getDate(timestamp)

  const action = "GeneralAccurateOCR"
  const version = "2018-11-19"
  const payload = JSON.stringify({ ImageBase64: imageBase64, Language: "auto" })

  const signedHeaders = "content-type;host"
  const hashedRequestPayload = getHash(payload)
  const httpRequestMethod = "POST"
  const canonicalUri = "/"
  const canonicalQueryString = ""
  const canonicalHeaders =
    "content-type:application/json; charset=utf-8\n" +
    "host:" + host + "\n"

  const canonicalRequest =
    httpRequestMethod + "\n" +
    canonicalUri + "\n" +
    canonicalQueryString + "\n" +
    canonicalHeaders + "\n" +
    signedHeaders + "\n" +
    hashedRequestPayload

  const algorithm = "TC3-HMAC-SHA256"
  const hashedCanonicalRequest = getHash(canonicalRequest)
  const credentialScope = date + "/" + service + "/" + "tc3_request"
  const stringToSign =
    algorithm + "\n" +
    timestamp + "\n" +
    credentialScope + "\n" +
    hashedCanonicalRequest

  const kDate = await sha256(date, "TC3" + TENCENTCLOUD_SECRET_KEY)
  const kService = await sha256(service, kDate)
  const kSigning = await sha256("tc3_request", kService)
  const signature = Array.from(await sha256(stringToSign, kSigning))
    .map(b => b.toString(16).padStart(2, '0')).join('')

  const authorization =
    algorithm + " " +
    "Credential=" + TENCENTCLOUD_SECRET_ID + "/" + credentialScope + ", " +
    "SignedHeaders=" + signedHeaders + ", " +
    "Signature=" + signature

  const headers = {
    Authorization: authorization,
    "Content-Type": "application/json; charset=utf-8",
    Host: host,
    "X-TC-Action": action,
    "X-TC-Timestamp": String(timestamp),
    "X-TC-Version": version,
    "X-TC-Region": TENCENTCLOUD_REGION,
  }

  const response = await fetch(`https://${host}`, {
    method: httpRequestMethod,
    headers,
    body: payload,
  })

  return await response.json()
}

const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url)
  if (url.pathname === '/health') {
    return new Response('OK', { status: 200 })
  }

  try {
    const update = await req.json()

    const secretToken = req.headers.get("x-telegram-bot-api-secret-token")
    if (secretToken !== AUTH_TOKEN) {
      return new Response("Unauthorized", { status: 401 })
    }

    const message = update.message
    if (!message) return new Response('ok')

    const chatId = message.chat.id

    if (message.text === '/start') {
      await sendReply(chatId, "Welcome! Please choose an app:", {
        inline_keyboard: [
           [{ text: "☀️ Weather App", web_app: { url: "https://test-telegram-mini-apps-qsev.vercel.app/" } }],
           [{ text: "📝 Daily Report App", web_app: { url: "https://daily-report-tg-mini-apps.vercel.app/" } }],
           [{ text: "📷 QR Code App", web_app: { url: "https://tg-mini-app-qr-dev.vercel.app/" } }],
        ]
      })
    }

    else if (message.photo) {
      await sendReply(chatId, "📤 Receiving and processing your image...")

      const photoArray = message.photo
      const bestPhoto = photoArray[photoArray.length - 1]

      const LIMIT_10MB = 10 * 1024 * 1024;
      if (bestPhoto.file_size && bestPhoto.file_size > LIMIT_10MB) {
        await sendReply(chatId, "❌ Upload rejected: File size exceeds the 10MB limit.");
        return new Response('ok');
      }

      const fileId = bestPhoto.file_id

      const fileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`)
      const fileData = await fileRes.json()
      if (!fileData.ok) {
        await sendReply(chatId, "❌ Failed to retrieve file info from Telegram.")
        return new Response('ok')
      }

      const filePath = fileData.result.file_path

      const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`
      const imageRes = await fetch(downloadUrl)
      if (!imageRes.body) {
        throw new Error("Failed to get image stream")
      }

      await sendReply(chatId, "🔐 Processing image...")
      const imageBase64 = await streamToBase64(imageRes.body)

      await sendReply(chatId, "🔍 Performing OCR recognition...")
      let ocrResult: string = ""
      try {
        const ocrResponse = await callTencentOCRWithBase64(imageBase64)
        console.log("OCR Response:", JSON.stringify(ocrResponse))

        if (ocrResponse.Response && ocrResponse.Response.TextDetections) {
          const texts = ocrResponse.Response.TextDetections
            .filter((item: any) => item.DetectedText)
            .map((item: any) => item.DetectedText)
            .join('\n')

          if (texts) {
            ocrResult = texts
          } else {
            ocrResult = "No text detected in the image."
          }
        } else {
          ocrResult = `OCR Error: ${ocrResponse.Response?.Error?.Message || "Unknown error"}`
        }
      } catch (ocrErr) {
        console.error("OCR Error:", ocrErr)
        ocrResult = `OCR processing failed: ${ocrErr instanceof Error ? ocrErr.message : String(ocrErr)}`
      }

      const resultText = `✅ Processing complete!\n\n📄 OCR Result:\n${ocrResult}`
      await sendReply(chatId, resultText.length > 4000 ? resultText.substring(0, 4000) + "...(truncated)" : resultText)
    }

    return new Response('ok')
  } catch (err) {
    console.error("Internal Logic Error:", err)
    return new Response('error', { status: 200 })
  }
}

async function sendReply(chatId: number, text: string, replyMarkup: any = undefined) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      reply_markup: replyMarkup
    })
  })
}

serve(handler, { port: PORT })
console.log(`Server running on port ${PORT}`)
