# Chat AI 项目

这是一个基于Vue.js前端和Django后端的AI聊天应用，提供智能问答功能。

## 项目结构

```
chat-ai/
├── frontend/          # Vue.js前端应用
├── backend/           # Django后端API
├── nginx/             # Nginx反向代理配置
└── README.md          # 项目说明文档
```

## 后端配置

### 1. 安装Python依赖

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
COZE_API_KEY=your_actual_api_key_here  # Coze API密钥
COZE_API_URL=https://api.coze.cn/v3/chat  # Coze API地址
COZE_BOT_ID=your_actual_bot_id_here  # Coze机器人ID
COZE_USER_ID=123456789  # Coze用户ID

# Django配置
SECRET_KEY=your_actual_secret_key_here  # Django密钥
DEBUG=True  # 调试模式
```

### 3. 数据库迁移

```bash
python manage.py migrate
```

### 4. 启动Django服务器

```bash
python manage.py runserver
```

后端服务器将在 http://localhost:8000 运行

## 安全说明

- `.env` 文件包含敏感信息，已被添加到 `.gitignore` 中
- 请确保不要将包含真实API密钥的 `.env` 文件提交到 git
- 生产环境中请使用强密码和HTTPS

## 前端配置

### 1. 安装Node.js依赖

```bash
cd frontend
npm install
```

### 2. 启动Vue开发服务器

```bash
npm run dev
```

前端服务器将在 http://localhost:5173 运行

## Nginx 配置

1. 复制 nginx/chat-ai.conf 到Nginx配置文件夹
2. 启动 Nginx服务

网页将在 http://localhost 运行，通过Nginx反向代理访问

## API端点

- `POST /api/chat/stream/` - 流式AI聊天API
- `POST /api/chat/cancel/` - 取消对话API

## 功能特性

- 智能AI对话
- 流式响应显示
- 思考过程展示
- 代码语法高亮
- Markdown渲染
- 响应式设计
- 会话状态管理
