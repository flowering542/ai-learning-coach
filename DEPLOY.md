# AI Learning Coach - 学习教练 MVP 部署指南

## 项目概述

AI 学习教练是一个基于 OpenClaw + QQ Bot 的医学职称考试辅导系统，针对输血技术中级职称考试（代码：390）。

**核心功能：**
- ✅ 智能练习（276道高质量真题）
- ✅ 错题归因分析
- ✅ 薄弱点识别
- ✅ 情感陪伴系统
- ✅ 学习进度追踪
- ✅ 成就徽章系统
- ✅ 激活码管理

---

## 快速开始

### 1. 环境要求

- Node.js 18+
- npm 或 pnpm
- Linux/macOS/Windows

### 2. 安装依赖

```bash
cd ai-learning-coach
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入你的配置
```

### 4. 启动服务

**方式一：HTTP 服务模式（推荐）**
```bash
./start.sh
# 或
COACH_PORT=3000 COACH_ADMIN_QQ_IDS=your_qq_id node server.js
```

**方式二：OpenClaw Agent 模式**
```bash
npm run dev
```

---

## 项目结构

```
ai-learning-coach/
├── data/                      # 数据目录
│   ├── questions.json         # 题库（276道真题）
│   ├── students/              # 学生数据（自动创建）
│   └── backup/                # 备份目录（自动创建）
├── src/                       # 源代码
│   ├── index.ts              # 主入口（OpenClaw Agent）
│   ├── storage.ts            # 数据存储
│   ├── error-analysis.ts     # 错题归因
│   └── emotional-companion.ts # 情感陪伴
├── server.ts                  # HTTP 服务入口
├── coach-tool.ts              # Coach 工具模块
├── agent-extension.ts         # Agent 扩展
├── start.sh                   # 启动脚本
├── package.json
└── README.md
```

---

## 配置说明

### 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| COACH_PORT | 否 | 3000 | HTTP 服务端口 |
| COACH_ADMIN_QQ_IDS | 是 | - | 管理员 QQ ID，逗号分隔 |
| COACH_DATA_DIR | 否 | ./data | 数据存储目录 |
| OPENAI_API_KEY | 否 | - | AI API Key（可选） |

### 激活码

默认激活码（可在代码中修改）：
- `COACH-DEMO-001`
- `COACH-DEMO-002`
- `STUDENT2024A`
- `STUDENT2024B`
- `STUDENT2024C`

---

## 使用指南

### 学生端

首次使用：
1. 添加 QQ Bot 为好友
2. 发送激活码（如：`COACH-DEMO-001`）
3. 激活成功后即可使用

常用命令：
- `/练习` 或 `/lx` - 开始练习题
- `/错题` 或 `/ct` - 复习错题
- `/进度` - 查看学习进度
- `/分析` 或 `/fx` - 薄弱点分析
- `/徽章` - 查看成就徽章
- `/打卡` - 学习打卡
- `/帮助` - 显示帮助

### 管理员端

管理员命令：
- `/模式` - 查看当前模式
- `/生成激活码` - 创建新激活码
- `/学生列表` - 查看所有学生
- `/统计` - 查看学习统计
- `/备份` - 手动备份数据

---

## 部署到生产环境

### 使用 PM2

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start server.js --name ai-learning-coach

# 查看状态
pm2 status

# 查看日志
pm2 logs ai-learning-coach

# 保存配置
pm2 save
pm2 startup
```

### 使用 Docker

```bash
# 构建镜像
docker build -t ai-learning-coach .

# 运行容器
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e COACH_ADMIN_QQ_IDS=your_qq_id \
  --name learning-coach \
  ai-learning-coach
```

---

## 数据备份

数据自动存储在 `data/` 目录：
- `students/` - 学生数据（JSON 格式）
- `questions.json` - 题库
- `backup/` - 自动备份

手动备份：
```bash
# 管理员发送命令
/备份
```

---

## 开发计划

### MVP 阶段（当前）
- [x] 基础练习功能
- [x] 错题记录
- [x] 进度统计
- [x] 激活码系统
- [x] 276道真题库

### 下一阶段
- [ ] 管理端 Web 界面
- [ ] 更多科目支持
- [ ] AI 智能讲解
- [ ] 学习报告生成
- [ ] 企业版功能

---

## 常见问题

**Q: 如何添加更多题目？**
A: 编辑 `data/questions.json`，按现有格式添加题目。

**Q: 如何修改激活码？**
A: 编辑 `src/index.ts` 中的 `VALID_CODES` 集合。

**Q: 数据存储在哪里？**
A: 默认存储在 `data/students/` 目录，每个用户一个 JSON 文件。

**Q: 如何迁移数据？**
A: 复制 `data/` 目录到新的服务器即可。

---

## 许可证

MIT License

---

## 联系方式

如有问题，请联系管理员。
