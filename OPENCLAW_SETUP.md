# OpenClaw 集成配置指南

本文档介绍如何在 OpenClaw 中配置 AI Learning Coach，支持 QQ Bot 和飞书等多个平台。

## 架构概览

```
用户 (QQ/飞书/其他)
    ↓
OpenClaw Channel Plugin (qqbot/feishu)
    ↓
OpenClaw Main Agent
    ↓
Coach Skill (自动检测命令)
    ↓
Coach HTTP API (localhost:3000)
    ↓
返回学习题目/进度/分析等
```

## 部署步骤

### 1. 部署 Coach HTTP 服务

```bash
# 克隆仓库
git clone https://github.com/flowering542/ai-learning-coach.git
cd ai-learning-coach
git checkout feat/mvp-setup

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env，设置 COACH_ADMIN_QQ_IDS

# 启动服务
pm2 start ecosystem.config.json

# 验证服务
curl http://localhost:3000/health
```

### 2. 安装 Coach Skill

Coach Skill 已经位于 `~/.openclaw/workspace/skills/coach/`，包含以下文件：

```
skills/coach/
├── SKILL.md          # Skill 定义（frontmatter + 文档）
├── _meta.json        # Skill 元数据
├── index.ts          # Tool 实现
├── package.json      # 包配置
└── README.md         # 说明文档
```

验证安装：
```bash
openclaw skills list | grep coach
```

应该显示：
```
│ ✓ ready   │ 📦 coach          │ AI Learning Coach - 医学职称考试辅导系统...
```

### 3. 配置平台（QQ Bot）

编辑 `~/.openclaw/openclaw.json`：

```json
{
  "channels": {
    "qqbot": {
      "enabled": true,
      "appId": "你的_APP_ID",
      "clientSecret": "你的_SECRET"
    }
  }
}
```

获取 QQ Bot 凭证：
1. 访问 [QQ开放平台](https://bot.q.qq.com/)
2. 创建 Bot 并获取 AppID 和 Secret
3. 配置回调地址（如使用 WebSocket 则无需配置）

### 4. 配置平台（飞书）

编辑 `~/.openclaw/openclaw.json`：

```json
{
  "channels": {
    "feishu": {
      "enabled": true,
      "appId": "你的_APP_ID",
      "appSecret": "你的_SECRET",
      "domain": "feishu",
      "groupPolicy": "open"
    }
  }
}
```

获取飞书凭证：
1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 创建企业自建应用
3. 获取 App ID 和 App Secret
4. 配置事件订阅和权限

## 工作原理

### 命令检测

Coach Skill 会自动检测以下命令：

| 类型 | 命令示例 |
|------|----------|
| 激活码 | `COACH-DEMO-001`, `STUDENT2024A`, `STU-XXXXXX` |
| 练习 | `/练习`, `/lx`, "练习", "做题" |
| 错题 | `/错题`, `/ct`, "错题" |
| 进度 | `/进度`, `/jd`, "进度", "成绩" |
| 分析 | `/分析`, `/fx`, "分析" |
| 徽章 | `/徽章`, `/bj`, "徽章" |
| 打卡 | `/打卡`, `/dk`, "打卡" |
| 帮助 | `/帮助`, "帮助" |
| 答题 | `A`, `B`, `C`, `D` 或 `1`, `2`, `3`, `4` |
| 继续 | "继续", "下一题" |

### 消息流转

1. **用户发送消息** → Channel Plugin（qqbot/feishu）接收
2. **Plugin 转发** → OpenClaw Main Agent
3. **Agent 检测** → 如果是 Coach 命令，调用 `coach` tool
4. **Tool 调用** → HTTP POST 到 `localhost:3000/api/coach`
5. **返回结果** → 直接回复给用户

### HTTP API 格式

```http
POST /api/coach
Content-Type: application/json

{
  "command": "/练习",
  "userId": "user_123",
  "platform": "qq"
}
```

响应：
```json
{
  "result": "📝 练习题\n..."
}
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `COACH_API_URL` | Coach HTTP API 地址 | `http://localhost:3000/api/coach` |
| `COACH_PORT` | HTTP 服务端口 | `3000` |
| `COACH_ADMIN_QQ_IDS` | 管理员 QQ ID | - |
| `COACH_DATA_DIR` | 数据存储目录 | `./data` |

## 测试验证

### 1. 测试 HTTP API

```bash
# 健康检查
curl http://localhost:3000/health

# 激活测试
curl -X POST http://localhost:3000/api/coach \
  -H "Content-Type: application/json" \
  -d '{"command": "COACH-DEMO-001", "userId": "test_001", "platform": "qq"}'

# 练习测试
curl -X POST http://localhost:3000/api/coach \
  -H "Content-Type: application/json" \
  -d '{"command": "/练习", "userId": "test_001", "platform": "qq"}'
```

### 2. 测试 Skill 加载

```bash
openclaw skills list | grep coach
```

### 3. 测试端到端

在 QQ 或飞书中发送：
- `COACH-DEMO-001` - 激活
- `/帮助` - 查看命令
- `/练习` - 开始做题
- `A` 或 `1` - 选择答案

## 故障排查

### Skill 未加载

检查 `~/.openclaw/workspace/skills/coach/SKILL.md` 是否有正确的 frontmatter：

```yaml
---
name: coach
description: "AI Learning Coach..."
tools:
  - name: coach
    ...
---
```

### API 调用失败

检查 HTTP 服务是否运行：
```bash
pm2 status
curl http://localhost:3000/health
```

### 消息未路由

检查消息是否为 Coach 命令（见上表）。普通消息不会被路由到 Coach。

## 多平台支持

当前支持的平台：

| 平台 | 状态 | 说明 |
|------|------|------|
| QQ Bot | ✅ | 通过 qqbot 插件 |
| 飞书 | ✅ | 通过 feishu 插件 |
| 钉钉 | ✅ | 通过 ddingtalk 插件（需配置） |
| 企业微信 | ✅ | 通过 wecom 插件（需配置） |

添加新平台：
1. 在 `openclaw.json` 中启用对应 channel
2. 配置平台凭证
3. 无需修改 Coach 代码，自动支持

## 管理员功能

管理员 QQ ID 在 `COACH_ADMIN_QQ_IDS` 中设置，可使用以下命令：

- `/模式` - 查看当前模式
- `/生成激活码` - 创建新激活码
- `/学生列表` - 查看所有学生
- `/统计` - 查看学习统计
- `/备份` - 手动备份数据

## 数据存储

- **题库**: `ai-learning-coach/data/questions.json`（276道真题）
- **学生数据**: `ai-learning-coach/data/students/{userId}.json`
- **备份**: `ai-learning-coach/data/backup/`

## 更新维护

更新 Coach 服务：
```bash
cd ai-learning-coach
git pull origin feat/mvp-setup
npm install
pm2 restart ai-learning-coach
```

查看日志：
```bash
pm2 logs ai-learning-coach
```

## 参考

- [AI Learning Coach README](./README.md)
- [部署指南](./DEPLOY.md)
- [集成说明](./INTEGRATION.md)
- [OpenClaw 文档](https://docs.openclaw.ai)