# AI Learning Coach - 学习教练 🤖📚

基于 OpenClaw + QQ Bot 的医学职称考试辅导系统，为输血技术中级职称考试（代码：390）考生提供个性化 AI 学习教练服务。

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-2026.2.9-orange.svg)](https://openclaw.ai)

## ✨ 核心特性

- 🎯 **智能练习** - 276道高质量真题，薄弱点优先推荐
- 🧠 **错题归因** - 分析错因（概念不清/粗心/没见过/审题错误）
- 📊 **进度追踪** - 实时统计正确率、连续学习天数
- 🏆 **成就徽章** - 学习里程碑可视化
- 💬 **情感陪伴** - 鼓励、安慰、考前疏导
- 🔑 **激活码系统** - 简单的授权管理
- 📱 **QQ Bot** - 原生 QQ 体验，无需额外 App

## 🚀 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/flowering542/ai-learning-coach.git
cd ai-learning-coach
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入你的 QQ ID
```

### 4. 启动服务

```bash
# HTTP 服务模式
./start.sh

# 或使用 PM2 守护进程
npm install -g pm2
pm2 start ecosystem.config.json
```

## 📖 使用指南

### 学生端

**首次使用：**
1. 添加 QQ Bot 为好友
2. 发送激活码：`COACH-DEMO-001`
3. 激活成功后即可开始学习

**常用命令：**

| 命令 | 说明 |
|------|------|
| `/练习` | 开始练习题 |
| `/错题` | 复习错题 |
| `/进度` | 查看学习进度 |
| `/分析` | 薄弱点分析报告 |
| `/徽章` | 查看成就徽章 |
| `/打卡` | 学习打卡 |
| `/帮助` | 显示帮助信息 |

### 管理员端

| 命令 | 说明 |
|------|------|
| `/生成激活码` | 创建新激活码 |
| `/学生列表` | 查看所有学生 |
| `/统计` | 查看学习统计 |
| `/备份` | 手动备份数据 |

## 📁 项目结构

```
ai-learning-coach/
├── data/                      # 数据目录
│   ├── questions.json         # 题库（276道真题）
│   ├── students/              # 学生数据
│   └── backup/                # 备份目录
├── src/                       # 源代码
│   ├── index.ts              # 主入口
│   ├── storage.ts            # 数据存储
│   ├── error-analysis.ts     # 错题归因
│   └── emotional-companion.ts # 情感陪伴
├── server.ts                  # HTTP 服务
├── start.sh                   # 启动脚本
├── deploy.sh                  # 部署脚本
├── Dockerfile                 # Docker 配置
├── docker-compose.yml         # Docker Compose
├── ecosystem.config.json      # PM2 配置
└── DEPLOY.md                  # 详细部署文档
```

## 🐳 Docker 部署

```bash
# 使用 Docker Compose
docker-compose up -d

# 或使用 Docker
docker build -t ai-learning-coach .
docker run -d -p 3000:3000 -v $(pwd)/data:/app/data ai-learning-coach
```

## 🔧 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `COACH_PORT` | 否 | 3000 | HTTP 服务端口 |
| `COACH_ADMIN_QQ_IDS` | 是 | - | 管理员 QQ ID |
| `COACH_DATA_DIR` | 否 | ./data | 数据目录 |

## 📊 数据存储

- **题库**: `data/questions.json`（276道真题）
- **学生数据**: `data/students/{userId}.json`
- **备份**: `data/backup/`

## 🛣️ 路线图

### MVP（当前）
- [x] 基础练习功能
- [x] 错题记录与归因
- [x] 进度统计
- [x] 激活码系统
- [x] 276道真题库

### v1.1
- [ ] Web 管理端
- [ ] AI 智能讲解
- [ ] 学习报告生成

### v1.2
- [ ] 多科目支持
- [ ] 企业版功能
- [ ] 数据可视化

## 🤝 贡献

欢迎提交 Issue 和 PR！

## 📄 许可证

MIT License

## 🙏 致谢

- [OpenClaw](https://openclaw.ai) - AI Agent 框架
- 输血技术考试真题来源：考试宝典等公开资料

---

**让 AI 成为你的专属学习教练！** 📚✨