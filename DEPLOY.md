# 🚀 Coolify 部署指南

## 📋 部署前检查清单

- [ ] 代码已推送到 GitHub/GitLab
- [ ] Coolify 服务器已安装并可访问
- [ ] 拥有 Telegram Bot Token
- [ ] 拥有腾讯云 OCR 密钥

---

## 1️⃣ 推送代码到远程仓库

```bash
# 在 GitHub/GitLab 创建新仓库（例如：tg-test-bots-menu）
# 然后：

git remote add origin https://github.com/yourusername/tg-test-bots-menu.git
git branch -M main
git push -u origin main
```

---

## 2️⃣ Coolify 部署步骤

### Step 1: 登录 Coolify Dashboard
- 打开你的 Coolify 地址（例如：`https://coolify.yourdomain.com`）
- 使用管理员账号登录

### Step 2: 添加资源
1. 点击 **"New Resource"** (或 "+" 按钮)
2. 选择 **"Application"**
3. 选择你的 **Git 提供商**（GitHub/GitLab）
4. 选择仓库：**tg-test-bots-menu**
5. 选择分支：**main**

### Step 3: 配置构建设置
- **Build Pack**: 选择 `Docker Compose`
- **Base Directory**: `/`（默认）
- **Docker Compose File**: `docker-compose.yml`（默认）

### Step 4: 配置环境变量

在 Coolify 的 Environment Variables 部分添加以下变量：

| 变量名 | 值 | 必需 |
|--------|-----|------|
| `TEST_BOT_TOKEN` | your_bot_token_here | ✅ |
| `TG_TEST_BOTS_AUTH_TOKEN` | your_auth_token_here | ✅ |
| `TENCENTCLOUD_SECRET_ID` | your_secret_id_here | ✅ |
| `TENCENTCLOUD_SECRET_KEY` | your_secret_key_here | ✅ |
| `TENCENTCLOUD_REGION` | ap-guangzhou | ✅ |

⚠️ **重要**：所有敏感值都需要从 `.env` 文件或密码管理器获取

### Step 5: 部署
1. 点击 **"Deploy"** 按钮
2. 等待构建完成（约 2-5 分钟）
3. 记录分配的域名（例如：`tg-test-bots-menu-xxxxx.coolify.io`）

### Step 6: 验证部署
```bash
# 测试 health endpoint
curl https://<your-coolify-domain>/health
# 应该返回：OK
```

---

## 3️⃣ 更新 Telegram Bot Webhook

部署成功后，执行以下命令更新 webhook：

```bash
# 替换 <your-coolify-domain> 为你的实际域名
# 替换 <TEST_BOT_TOKEN> 为你的 Bot Token
# 替换 <AUTH_TOKEN> 为你的 Auth Token

curl -X POST "https://api.telegram.org/bot<TEST_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://<your-coolify-domain>/",
    "secret_token": "<AUTH_TOKEN>"
  }'
```

### 验证 Webhook 设置
```bash
curl "https://api.telegram.org/bot<TEST_BOT_TOKEN>/getWebhookInfo"
```

---

## 4️⃣ 功能测试

1. 在 Telegram 中打开你的 Bot
2. 发送 `/start` 命令
3. 应该收到欢迎消息和三个 Mini App 按钮
4. 发送一张图片
5. 应该收到 OCR 识别结果

---

## 5️⃣ 监控和日志

### 查看容器日志
在 Coolify Dashboard 中：
- 进入 Resource → Logs
- 或使用命令：
```bash
docker logs -f tg-test-bots-menu
```

### 健康检查
```bash
# 测试服务是否健康
curl https://<your-domain>/health
```

---

## 🔄 回滚计划

如需回滚到 Supabase：

```bash
# 切回 Supabase webhook
curl -X POST "https://api.telegram.org/bot<TEST_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://<your-supabase-project>.supabase.co/functions/v1/tg-test-bots-menu",
    "secret_token": "<AUTH_TOKEN>"
  }'

# 在 Coolify 中停止部署
# Dashboard → Resources → tg-test-bots-menu → Stop
```

---

## 📝 重要说明

### 零存储架构
- ❌ **无 Supabase Storage 依赖**
- ✅ 图片直接通过 **base64** 传输给腾讯云 OCR
- ✅ 不保存任何文件到磁盘或云存储
- ✅ 完全自托管，无外部存储依赖

### 环境变量说明
本项目只需要 5 个环境变量：

```
TEST_BOT_TOKEN              ← Telegram Bot Token
TG_TEST_BOTS_AUTH_TOKEN     ← 用于验证 Telegram Webhook
TENCENTCLOUD_SECRET_ID      ← 腾讯云 OCR Secret ID
TENCENTCLOUD_SECRET_KEY     ← 腾讯云 OCR Secret Key
TENCENTCLOUD_REGION         ← 腾讯云区域（默认 ap-guangzhou）
```

⚠️ **安全警告**：
- 永远不要将真实密钥提交到 Git
- 使用 `.env` 文件本地开发
- 生产环境通过 Coolify Dashboard 设置环境变量

---

## 🎉 完成！

部署成功后，你的 tg-test-bots-menu 将：
- ✅ 运行在 Coolify 上
- ✅ 通过 base64 直接处理图片 OCR
- ✅ 无需任何存储服务
- ✅ 完全自托管

如有问题，检查 Coolify 容器日志或联系管理员。
