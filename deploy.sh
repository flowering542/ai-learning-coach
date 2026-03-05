#!/bin/bash
# 学习教练 Agent 部署脚本

set -e

echo "🚀 部署学习教练 Agent..."

# 1. 检查环境
echo "📋 检查环境..."
if [ ! -f ~/.openclaw/openclaw.json ]; then
    echo "❌ OpenClaw 未配置"
    exit 1
fi

# 2. 复制 Agent 配置
echo "📁 配置 Agent..."
mkdir -p ~/.openclaw/agents/coach
cp agents/coach/agent.json ~/.openclaw/agents/coach/ 2>/dev/null || true

# 3. 设置环境变量
echo "🔧 设置环境变量..."
if [ -f ~/.openclaw/.env ]; then
    # 备份原配置
    cp ~/.openclaw/.env ~/.openclaw/.env.backup.$(date +%Y%m%d_%H%M%S)
fi

# 添加 Coach Agent 配置
cat >> ~/.openclaw/.env << 'EOF'

# 学习教练 Agent 配置
COACH_ADMIN_QQ_IDS=
COACH_VALID_CODES=STUDENT2024A,STUDENT2024B,STUDENT2024C,COACH-DEMO-001,COACH-DEMO-002
EOF

echo "✅ 环境变量已添加到 ~/.openclaw/.env"

# 4. 检查 QQ Bot 配置
echo "🔍 检查 QQ Bot 配置..."
if ! grep -q '"qqbot"' ~/.openclaw/openclaw.json; then
    echo "⚠️ QQ Bot 未配置，请先运行: openclaw channel add qqbot"
    exit 1
fi

# 5. 重启 OpenClaw Gateway
echo "🔄 重启 OpenClaw..."
openclaw gateway restart || true

echo ""
echo "✅ 部署完成！"
echo ""
echo "📖 下一步："
echo "1. 编辑 ~/.openclaw/.env，添加你的 QQ OpenID 到 COACH_ADMIN_QQ_IDS"
echo "2. 重启 OpenClaw: openclaw gateway restart"
echo "3. 给你的 QQ Bot 发送消息测试"
echo ""
echo "💡 演示激活码："
echo "   COACH-DEMO-001"
echo "   COACH-DEMO-002"
echo "   STUDENT2024A"
