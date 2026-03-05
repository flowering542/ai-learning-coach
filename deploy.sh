#!/bin/bash
# 学习教练 Agent 部署脚本

set -e

echo "🚀 开始部署学习教练 Agent..."

# 配置
APP_NAME="coach-agent"
APP_DIR="/opt/ai-learning-coach"
REPO_URL="https://github.com/flowering542/ai-learning-coach.git"
PORT=3000

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 18+"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"

# 创建或更新应用目录
if [ -d "$APP_DIR" ]; then
    echo "📦 更新代码..."
    cd $APP_DIR
    git pull origin main
else
    echo "📦 克隆代码..."
    git clone $REPO_URL $APP_DIR
    cd $APP_DIR
fi

# 安装依赖
echo "📦 安装依赖..."
npm install

# 编译
echo "🔨 编译 TypeScript..."
npm run build

# 创建数据目录
mkdir -p data/backup

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "⚠️  .env 文件不存在，创建模板..."
    cat > .env << EOF
# QQ Bot 配置
COACH_ADMIN_QQ_IDS=your_qq_id_here

# 可选：考试日期
EXAM_DATE=2026-06-15

# 可选：OpenClaw API（用于 AI 教练）
# OPENCLAW_API_ENDPOINT=http://localhost:3000/api/v1/chat
# OPENCLAW_API_KEY=your_key_here
EOF
    echo "⚠️  请编辑 .env 文件，配置你的管理员 QQ ID"
fi

# 使用 pm2 启动/重启
if command -v pm2 &> /dev/null; then
    echo "🔄 使用 pm2 启动服务..."
    pm2 delete $APP_NAME 2>/dev/null || true
    pm2 start dist/index.js --name $APP_NAME -- --port $PORT
    pm2 save
else
    echo "⚠️  pm2 未安装，使用 nohup 启动..."
    nohup node dist/index.js --port $PORT > app.log 2>&1 &
fi

echo ""
echo "✅ 部署完成！"
echo ""
echo "📋 下一步："
echo "1. 编辑 .env 文件配置管理员 QQ"
echo "2. 配置 QQ Bot webhook 指向: http://$(curl -s ifconfig.me):$PORT"
echo "3. 查看日志: pm2 logs $APP_NAME"
echo ""
