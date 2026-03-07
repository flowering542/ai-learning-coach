# AI Learning Coach - OpenClaw 集成指南

## 概述

AI Learning Coach HTTP 服务已部署在 `http://localhost:3000`，现在需要将其与 OpenClaw 的 QQ Bot 集成。

## 集成方式

### 方式一：修改 OpenClaw Main Agent（推荐）

在 OpenClaw 的 main agent 中添加对 Coach API 的调用。

编辑 `~/.openclaw/agents/main/` 下的相关文件，在消息处理逻辑中添加：

```typescript
// 在消息处理函数中添加
import { isCoachCommand, callCoachAPI } from '/root/.openclaw/workspace/ai-learning-coach/qqbot-integration';

async function handleMessage(message: string, userId: string, platform: string) {
  // 检查是否为 Coach 命令
  if (isCoachCommand(message)) {
    const result = await callCoachAPI(message, userId, platform);
    if (result) {
      return result; // 直接返回 Coach 的回复
    }
  }
  
  // 其他命令处理...
}
```

### 方式二：使用 OpenClaw 的 Tool 调用

在 OpenClaw 的 system prompt 中添加 Coach Tool 的描述，让 Agent 自动调用。

```
你是一个 AI 学习教练助手。当用户发送以下命令时，调用 coach_tool：

- /练习, /错题, /进度, /分析, /徽章, /打卡 - 学习相关命令
- COACH-DEMO-001, STUDENT2024A 等 - 激活码
- A, B, C, D - 答题选择

coach_tool 参数：
- command: 用户输入的命令
- userId: 用户ID
- platform: 平台（qq/feishu等）
```

### 方式三：独立 QQ Bot（当前已实现）

QQ Bot 扩展已安装，需要配置消息路由。

## 当前部署状态

- ✅ HTTP 服务：http://localhost:3000
- ✅ PM2 守护：ai-learning-coach
- ✅ 题库：276道真题
- ✅ API 测试通过

## 测试命令

```bash
# 健康检查
curl http://localhost:3000/health

# 激活测试
curl -X POST http://localhost:3000/api/coach \
  -H "Content-Type: application/json" \
  -d '{"command": "COACH-DEMO-001", "userId": "test_qq_001", "platform": "qq"}'

# 练习测试
curl -X POST http://localhost:3000/api/coach \
  -H "Content-Type: application/json" \
  -d '{"command": "/练习", "userId": "test_qq_001", "platform": "qq"}'
```

## 下一步

需要配置 OpenClaw Main Agent 调用 Coach API，或者配置 QQ Bot 的消息路由。

请告诉我你希望的集成方式，我可以帮你完成配置。