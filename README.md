# Chat AI 项目

这是一个基于Vue.js前端和Django后端的AI聊天应用。

## 项目结构

```
chat-ai/
├── frontend/          # Vue.js前端
├── backend/           # Django后端
└── README.md
```

## 后端配置

### 1. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 环境变量配置

复制环境变量示例文件并配置你的API密钥：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的实际配置：

```env
# Coze API配置
COZE_API_KEY=your_actual_api_key_here
COZE_API_URL=https://api.coze.cn/v3/chat
COZE_BOT_ID=your_actual_bot_id_here
COZE_USER_ID=123456789

# Django配置
SECRET_KEY=your_actual_secret_key_here
DEBUG=True
```

### 3. 数据库迁移

```bash
python manage.py migrate
```

### 4. 启动服务器

```bash
python manage.py runserver
```

后端服务器将在 http://localhost:8000 运行

## 安全说明

- `.env` 文件包含敏感信息，已被添加到 `.gitignore` 中
- 请确保不要将包含真实API密钥的 `.env` 文件提交到 git


## 前端配置

### 1. 安装依赖

```bash
cd frontend
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

前端服务器将在 http://localhost:5173 运行

## Nginx 配置
1. 复制 nginx/chat-ai.conf 到配置文件夹
2. 启动 Nginx

网页将在 http://localhost 运行

## API端点
- `POST /api/chat/stream/` - 流式AI聊天API
