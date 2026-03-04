# AI 学习教练平台

用 AI 规模化地提供「被关注、被理解、被鼓励」的个性化学习体验

## 🎯 产品定位

**不是考试工具，是「学习教练」**

- ✅ 记住你的薄弱点，针对性出题
- ✅ 进步时及时肯定
- ✅ 沮丧时鼓励
- ✅ 考前焦虑时陪伴
- ✅ 考过后庆祝

## 🏗️ 项目结构

```
ai-learning-coach/
├── docs/               # 文档
│   └── PRD.md         # 产品需求文档
├── src/               # 源代码
│   ├── bot/          # QQ Bot 逻辑
│   ├── admin/        # 管理端
│   └── shared/       # 共享代码
├── config/           # 配置文件
├── scripts/          # 脚本工具
└── data/            # 数据文件
```

## 🚀 快速开始

### 环境要求

- Node.js 22+
- OpenClaw
- QQ Bot 账号

### 安装

```bash
# 克隆仓库
git clone https://github.com/yourname/ai-learning-coach.git
cd ai-learning-coach

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 启动开发服务器
npm run dev
```

## 📋 功能模块

### 学生端（QQ Bot）
- 智能对话学习
- 个性化学习路径
- 情感陪伴系统
- 题库练习

### 管理端（Web）
- 学员管理
- 数据看板
- 内容管理

## 💰 商业模式

| 版本 | 价格 | 功能 |
|------|------|------|
| 免费试用 | 0 元 | 前 3 章 + 基础题库 |
| 标准版 | 199 元/年 | 完整课程 + AI 教练 |
| VIP 版 | 499 元/年 | + 1v1 答疑 + 考前冲刺 |

## 🛣️ 路线图

- **Phase 1**: MVP 验证（1-2 个月）
- **Phase 2**: 产品完善（3-6 个月）
- **Phase 3**: 规模化（6-12 个月）

## 📄 许可证

MIT
