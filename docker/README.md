# Docker 部署说明

本项目使用 Docker 容器化部署，包含前端、后端和 Nginx 三个服务。

## 文件结构

```
docker/
├── backend.Dockerfile    # 后端 Django 应用
├── frontend.Dockerfile   # 前端 Vue.js 应用
├── nginx.Dockerfile      # Nginx 反向代理
├── docker-compose.yml    # Docker Compose 配置
├── deploy.sh            # 部署脚本
└── README.md            # 说明文档
```

## 部署步骤

### 1. 环境准备

确保已安装 Docker 和 Docker Compose：

```bash
# 检查 Docker 版本
docker --version
docker-compose --version
```

### 2. 环境变量配置

确保 `docker/.env` 文件存在并包含必要的环境变量：

```env
# Coze API配置
COZE_API_KEY=your_actual_api_key_here
COZE_API_URL=https://api.coze.cn/v3/chat
COZE_BOT_ID=your_actual_bot_id_here
COZE_USER_ID=123456789

# Django配置
SECRET_KEY=your_actual_secret_key_here
DEBUG=False
```

### 3. 快速部署

使用部署脚本一键部署：

```bash
cd docker
./deploy.sh
```

### 4. 手动部署

或者手动执行以下命令：

```bash
# 进入 docker 目录
cd docker

# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

## 服务访问

部署成功后，可以通过以下地址访问：

- **前端应用**: http://localhost:5173
- **后端API**: http://localhost:8000
- **Nginx代理**: http://localhost

## 常用命令

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 重新构建并启动
docker-compose up --build -d

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx
```

## 故障排除

### 1. 构建失败
- 检查 Docker 是否正常运行
- 检查网络连接
- 查看构建日志：`docker-compose build --no-cache`

### 2. 服务启动失败
- 检查环境变量文件是否存在
- 查看服务日志：`docker-compose logs [service_name]`
- 检查端口是否被占用

### 3. 环境变量问题
- 确保 `backend/.env` 文件存在
- 检查环境变量格式是否正确
- 重启服务：`docker-compose restart backend`

## 生产环境部署

生产环境建议：

1. 使用 HTTPS
2. 配置数据库持久化
3. 设置日志轮转
4. 配置监控和告警
5. 使用 Docker Swarm 或 Kubernetes 进行容器编排

## 注意事项

- 环境变量文件 `.env` 包含敏感信息，不要提交到代码仓库
- 生产环境请修改默认端口和密码
- 定期更新 Docker 镜像和依赖包
- 备份重要数据 