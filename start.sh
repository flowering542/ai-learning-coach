#!/bin/bash
# Coach HTTP 服务启动脚本

export COACH_PORT=${COACH_PORT:-3000}
export COACH_ADMIN_QQ_IDS=${COACH_ADMIN_QQ_IDS:-"1933622876"}
export COACH_DATA_DIR=${COACH_DATA_DIR:-"./data"}

echo "[Coach] 启动 HTTP 服务..."
echo "[Coach] 端口: $COACH_PORT"
echo "[Coach] 管理员: $COACH_ADMIN_QQ_IDS"
echo "[Coach] 数据目录: $COACH_DATA_DIR"

node server.js
