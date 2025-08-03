#!/bin/bash

# Chat AI Docker 部署脚本

echo "🚀 开始部署 Chat AI 应用..."

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未运行，请先启动 Docker"
    exit 1
fi

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "❌ 环境变量文件不存在: .env"
    echo "请先创建环境变量文件"
    exit 1
fi

# 构建镜像
echo "📦 构建 Docker 镜像..."
docker-compose build

if [ $? -ne 0 ]; then
    echo "❌ 构建失败"
    exit 1
fi

# 启动服务
echo "🚀 启动服务..."
docker-compose up -d

if [ $? -eq 0 ]; then
    echo "✅ 部署成功！"
    echo ""
    echo "🌐 服务访问地址："
    echo "   - 前端: http://localhost:5173"
    echo "   - 后端API: http://localhost:8000"
    echo "   - Nginx代理: http://localhost"
    echo ""
    echo "📋 常用命令："
    echo "   - 查看日志: docker-compose logs -f"
    echo "   - 停止服务: docker-compose down"
    echo "   - 重启服务: docker-compose restart"
    echo "   - 重新构建: docker-compose up --build -d"
else
    echo "❌ 启动失败"
    exit 1
fi 
