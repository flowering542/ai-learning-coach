#!/bin/bash
# AI Learning Coach - QQ Bot 集成启动脚本
# 同时启动 HTTP 服务和 QQ Bot Agent

echo "🚀 启动 AI Learning Coach 完整服务"
echo "=================================="

# 设置环境变量
export COACH_PORT=${COACH_PORT:-3000}
export COACH_ADMIN_QQ_IDS=${COACH_ADMIN_QQ_IDS:-""}
export COACH_DATA_DIR=${COACH_DATA_DIR:-"./data"}
export COACH_API_URL="http://localhost:${COACH_PORT}/api/coach"
export COACH_HEALTH_URL="http://localhost:${COACH_PORT}/health"

echo ""
echo "📋 配置信息:"
echo "  HTTP 端口: $COACH_PORT"
echo "  管理员: $COACH_ADMIN_QQ_IDS"
echo "  数据目录: $COACH_DATA_DIR"
echo "  API 地址: $COACH_API_URL"

# 检查并启动 HTTP 服务
echo ""
echo "🔍 检查 HTTP 服务..."
if ! curl -s http://localhost:$COACH_PORT/health > /dev/null 2>&1; then
    echo "🚀 启动 HTTP 服务..."
    pm2 start ecosystem.config.json --name ai-learning-coach-http
else
    echo "✅ HTTP 服务已在运行"
fi

# 等待 HTTP 服务就绪
echo ""
echo "⏳ 等待服务就绪..."
for i in {1..10}; do
    if curl -s http://localhost:$COACH_PORT/health > /dev/null 2>&1; then
        echo "✅ HTTP 服务就绪"
        break
    fi
    sleep 1
done

# 启动 QQ Bot Agent (如果配置了)
echo ""
echo "🤖 检查 QQ Bot Agent..."
if [ -f "src/index.ts" ]; then
    echo "🚀 启动 QQ Bot Agent..."
    pm2 start src/index.ts --name ai-learning-coach-agent --interpreter tsx
else
    echo "⚠️ 未找到 Agent 入口文件，跳过 Agent 启动"
fi

echo ""
echo "✅ 服务启动完成！"
echo ""
echo "📊 查看状态: pm2 status"
echo "📜 查看日志: pm2 logs"
echo "🛑 停止服务: pm2 stop all"