# 学习教练 Agent 配置

## 管理员设置

编辑 `agents/coach/src/index.ts`，将你的 QQ OpenID 添加到 `ADMIN_QQ_IDS`：

```typescript
const ADMIN_QQ_IDS = new Set([
  "你的QQ_OPENID_HERE",  // 替换为实际的 OpenID
]);
```

## 如何获取 QQ OpenID

1. 先启动 Agent
2. 给你的 QQ Bot 发送一条消息
3. 查看日志中的 `qqId` 字段
4. 将对应的值添加到 ADMIN_QQ_IDS

## 使用流程

### 管理员（你的 QQ）
- 发送任意消息 → 进入个人助手模式
- /模式 - 查看当前模式
- /生成激活码 - 创建学生激活码
- /学生列表 - 查看学生名单
- /统计 - 查看学习数据
- /切换 - 临时切换到学生模式（测试用）

### 学生（其他人的 QQ）
- 首次使用 → 要求输入激活码
- 激活后 → 进入学习教练模式
- /练习 - 开始练习题
- /查询 - 搜索题目
- /进度 - 查看学习进度

### 演示激活码
- COACH-DEMO-001
- COACH-DEMO-002
- STUDENT2024A
- STUDENT2024B
- STUDENT2024C
