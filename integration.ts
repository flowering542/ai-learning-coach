// OpenClaw Main Agent 集成 - 学习教练路由
// 将此文件内容添加到主 Agent 的处理逻辑中

import { isCoachCommand, routeToCoachAgent } from './router';

// 在消息处理函数中添加
async function handleMessage(message: string, qqId: string, channel: string) {
  // 检查是否是学习教练命令
  if (channel === 'qqbot' && isCoachCommand(message)) {
    const result = await routeToCoachAgent(message, qqId);
    if (result) {
      return result;
    }
  }
  
  // 原有逻辑...
}
