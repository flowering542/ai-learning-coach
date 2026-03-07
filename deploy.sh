#!/bin/bash
# AI Learning Coach 部署脚本

set -e

echo "🚀 AI Learning Coach 部署脚本"
echo "=============================="

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 18+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 版本过低，需要 18+，当前版本: $(node -v)"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"

# 安装依赖
echo ""
echo "📦 安装依赖..."
npm install

# 创建数据目录
echo ""
echo "📁 创建数据目录..."
mkdir -p data/students
mkdir -p data/backup

# 检查环境变量
echo ""
echo "🔧 检查配置..."
if [ ! -f .env ]; then
    echo "⚠️  .env 文件不存在，从 .env.example 复制..."
    cp .env.example .env
    echo "⚠️  请编辑 .env 文件，填入你的配置"
fi

# 构建（如果是 TypeScript 项目）
if [ -f tsconfig.json ]; then
    echo ""
    echo "🔨 构建项目..."
    npm run build
fi

# 启动服务
echo ""
echo "🎯 启动服务..."
echo ""
echo "启动方式选择:"
echo "1) HTTP 服务模式 (推荐用于生产环境)"
echo "2) OpenClaw Agent 模式"
echo "3) PM2 守护进程模式"
echo ""
read -p "请选择 [1-3]: " choice

case $choice in
    1)
        echo "🚀 启动 HTTP 服务..."
        ./start.sh
        ;;
    2)
        echo "🚀 启动 OpenClaw Agent..."
        npm run dev
        ;;
    3)
        if ! command -v pm2 &> /dev/null; then
            echo "📦 安装 PM2..."
            npm install -g pm2
        fi
        echo "🚀 使用 PM2 启动..."
        npm run pm2:start
        echo ""
        echo "查看日志: npm run pm2:logs"
        echo "停止服务: npm run pm2:stop"
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

echo ""
echo "✅ 部署完成！"
echo ""
echo "📖 使用指南:"
echo "   - 学生发送激活码激活"
echo "   - 管理员命令: /模式 /生成激活码 /学生列表 /统计"
echo "   - 学生命令: /练习 /错题 /进度 /分析 /徽章 /打卡"
echo ""
echo "📚 详细文档: DEPLOY.md"