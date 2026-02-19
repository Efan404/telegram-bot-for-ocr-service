# 🤖 Telegram Receipt OCR Bot

基于 Node.js + Docker 的 Telegram 机器人，支持图片 OCR 文字识别和 AI 智能分析收据。

## ✨ 功能特性

- 📸 **图片 OCR** - 使用腾讯云 OCR 识别图片中的文字
- 🤖 **AI 智能分析** - 自动结构化收据信息（商店、日期、金额、商品等）
- 💰 **成本追踪** - 显示 Token 使用量和 API 调用成本
- 🌐 **多语言支持** - 智能识别收据语言和货币
- 📅 **日期智能解析** - 根据地区自动识别日期格式（中日韩/英美/新加坡等）
- 🚀 **完全自托管** - 无需依赖外部存储服务

## 🏗️ 技术栈

| 组件 | 技术 |
|------|------|
| 运行时 | Node.js 20 (Alpine) |
| OCR | 腾讯云 OCR API |
| AI | DeepSeek (OpenAI 兼容 API) |
| 部署 | Docker + Docker Compose |
| 托管 | Coolify / 任何 Docker 环境 |

## 📁 项目结构

```
├── index.js          # 主入口
├── config.js         # 环境变量配置
├── handler.js        # 请求处理器
├── telegram.js       # Telegram Bot 服务
├── ocr.js            # 腾讯云 OCR 服务
├── ai.js             # AI 结构化分析服务
├── utils.js          # 工具函数
├── package.json      # Node.js 依赖
├── Dockerfile        # Docker 构建文件
├── docker-compose.yml # Docker Compose 配置
└── .env              # 环境变量（不提交到 Git）
```

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd tg-test-bots-menu
```

### 2. 配置环境变量

```bash
cp .env.reference .env
```

编辑 `.env` 文件，填入以下配置：

```env
# Telegram Bot 配置
TEST_BOT_TOKEN=your_bot_token_here
TG_TEST_BOTS_AUTH_TOKEN=your_auth_token_here

# 腾讯云 OCR 配置
TENCENTCLOUD_SECRET_ID=your_secret_id_here
TENCENTCLOUD_SECRET_KEY=your_secret_key_here
TENCENTCLOUD_REGION=ap-guangzhou

# AI LLM 配置 (OpenAI 兼容)
AI_BASE_URL=https://api.qnaigc.com/v1
AI_API_KEY=your_api_key_here
LLM_MODEL=deepseek/deepseek-v3.2-251201
```

### 3. 本地运行

```bash
# 使用 Docker Compose
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 4. 本地测试

```bash
# 测试健康检查
curl http://localhost:8000/health
# 应该返回: OK
```

使用 [ngrok](https://ngrok.com/) 进行完整测试：

```bash
# 暴露本地服务
ngrok http 8000

# 设置 Telegram Webhook
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-ngrok-url.ngrok.io/",
    "secret_token": "YOUR_AUTH_TOKEN"
  }'
```

## 🌐 Coolify 部署

1. **推送代码到 GitHub/GitLab**

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **在 Coolify 中添加资源**
   - 点击 "New Resource" → "Application"
   - 选择 Git 提供商和仓库
   - 选择分支：main

3. **配置构建设置**
   - Build Pack: `Docker Compose`
   - Base Directory: `/`
   - Docker Compose File: `docker-compose.yml`

4. **配置环境变量**

在 Coolify Dashboard 中添加以下环境变量：

| 变量名 | 必需 | 说明 |
|--------|------|------|
| `TEST_BOT_TOKEN` | ✅ | Telegram Bot Token |
| `TG_TEST_BOTS_AUTH_TOKEN` | ✅ | Webhook 验证令牌 |
| `TENCENTCLOUD_SECRET_ID` | ✅ | 腾讯云 Secret ID |
| `TENCENTCLOUD_SECRET_KEY` | ✅ | 腾讯云 Secret Key |
| `TENCENTCLOUD_REGION` | ❌ | 腾讯云区域，默认 ap-guangzhou |
| `AI_BASE_URL` | ✅ | AI API 基础 URL |
| `AI_API_KEY` | ✅ | AI API Key |
| `LLM_MODEL` | ❌ | 模型名称，默认 deepseek/deepseek-v3.2-251201 |

5. **部署**
   - 点击 "Deploy" 按钮
   - 等待构建完成

6. **设置 Webhook**

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-coolify-domain.com/",
    "secret_token": "YOUR_AUTH_TOKEN"
  }'
```

## 📱 使用说明

### 基本命令

- `/start` - 显示欢迎信息和 Mini App 按钮

### 发送收据图片

1. 在 Telegram 中向 Bot 发送一张收据图片
2. Bot 会自动：
   - 📤 接收图片
   - 🔐 处理图片
   - 🔍 执行 OCR 识别
   - 🤖 AI 分析结构化数据
3. 收到结果：
   ```
   🤖 AI is structuring the data...
   
   *Receipt Summary*
   *Store*: [商店名]
   *Country*: JP
   *Date*: 2026-01-22
   -------------------
   売上    ¥9,510
   -------------------
   *Total*: JPY 9510
   
   📊 Token Usage & Cost
   Input: 777 | Output: 51
   💰 Cost: $0.000239
   ```

## 🔐 安全说明

- ⚠️ **永远不要提交 `.env` 文件到 Git**
- 🔑 使用强密码作为 `TG_TEST_BOTS_AUTH_TOKEN`
- 🛡️ Telegram Webhook 使用 Secret Token 验证请求
- ☁️ 生产环境通过 Coolify Dashboard 设置环境变量

## 🛠️ 开发

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器（需要本地有 Node.js 20）
npm start
```

### 调试日志

```bash
# 查看容器日志
docker-compose logs -f

# 查看实时日志
docker logs -f tg-test-bots-menu
```

## 📚 API 文档

### 腾讯云 OCR
- [通用印刷体识别](https://cloud.tencent.com/document/product/866/33526)

### AI LLM
- 支持任何 OpenAI 兼容的 API
- 默认使用 DeepSeek V3.2
- 可配置自定义端点（如 Azure、国内代理等）

### Telegram Bot
- [Telegram Bot API](https://core.telegram.org/bots/api)

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 💡 致谢

- 腾讯云 OCR 服务
- DeepSeek AI
- Telegram Bot Platform
