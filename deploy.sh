#!/bin/bash
# OpenClaw 插件部署脚本 - 学习教练 Agent

set -e

echo "🚀 开始部署学习教练 Agent (OpenClaw 插件)..."

# 配置
PLUGIN_NAME="coach-agent"
PLUGIN_DIR="${OPENCLAW_PLUGINS:-$HOME/.openclaw/plugins}/$PLUGIN_NAME"
REPO_URL="https://github.com/flowering542/ai-learning-coach.git"

# 检查 OpenClaw
if ! command -v openclaw &> /dev/null; then
    echo "❌ OpenClaw 未安装或未添加到 PATH"
    echo "请确保 OpenClaw 已正确安装"
    exit 1
fi

echo "✅ OpenClaw 已安装"

# 创建插件目录
mkdir -p "$PLUGIN_DIR"

# 克隆或更新代码
if [ -d "$PLUGIN_DIR/.git" ]; then
    echo "📦 更新代码..."
    cd "$PLUGIN_DIR"
    git pull origin main
else
    echo "📦 克隆代码..."
    git clone "$REPO_URL" "$PLUGIN_DIR"
    cd "$PLUGIN_DIR"
fi

# 安装依赖
echo "📦 安装依赖..."
npm install

# 编译
echo "🔨 编译 TypeScript..."
npm run build

# 创建数据目录
mkdir -p data/backup

# 检查环境变量配置
if [ ! -f ".env" ]; then
    echo "⚠️  .env 文件不存在，创建模板..."
    cat > .env << 'EOF'
# 管理员 QQ ID（多个用逗号分隔）
COACH_ADMIN_QQ_IDS=your_qq_id_here

# 可选：考试日期
EXAM_DATE=2026-06-15

# 可选：OpenClaw API 配置（用于 AI 教练）
# OPENCLAW_API_ENDPOINT=http://localhost:3000/api/v1/chat
# OPENCLAW_API_KEY=your_key_here
EOF
    echo "⚠️  请编辑 $PLUGIN_DIR/.env 文件，配置管理员 QQ ID"
fi

# 配置 OpenClaw 插件（如果支持）
if openclaw config get plugins 2>/dev/null | grep -q "coach-agent"; then
    echo "✅ OpenClaw 插件配置已存在"
else
    echo "📝 配置 OpenClaw 插件..."
    # 尝试配置（根据 OpenClaw 版本可能不同）
    openclaw config set plugins.coach-agent.path "$PLUGIN_DIR" 2>/dev/null || true
    openclaw config set plugins.coach-agent.enabled true 2>/dev/null || true
fi

echo ""
echo "✅ 部署完成！"
echo ""
echo "📋 下一步："
echo "1. 编辑 $PLUGIN_DIR/.env 配置管理员 QQ"
echo "2. 重启 OpenClaw: openclaw restart"
echo "3. 检查日志: openclaw logs"
echo ""
echo "💡 可用命令："
echo "   /练习 - 开始练习题"
echo "   /错题 - 复习错题"
echo "   /徽章 - 查看成就"
echo "   /分析 - 薄弱点报告"
echo ""
