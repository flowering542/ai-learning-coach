# 学习教练 Agent

## 功能定位
专门为学生提供学习辅导的 QQ Bot Agent

## 核心功能
1. 激活码验证 - 学生通过激活码获得使用权限
2. 题库查询 - 按科目、难度、知识点搜索题目
3. 学习记录 - 记录学生的练习历史和进度
4. 智能推荐 - 根据薄弱点推荐练习题

## 文件结构
```
agents/coach/
├── src/
│   ├── index.ts          # 主入口
│   ├── auth.ts           # 激活码验证
│   ├── questionBank.ts   # 题库管理
│   ├── studyRecord.ts    # 学习记录
│   └── router.ts         # 消息路由
├── data/
│   ├── questions.json    # 题库数据
│   ├── students.json     # 学生数据
│   └── activationCodes.json # 激活码
└── package.json
```

## 交互流程
1. 学生首次使用 → 要求输入激活码
2. 激活码验证 → 创建学生档案
3. 已激活学生 → 进入主菜单
4. 支持命令: /练习 /查询 /进度 /帮助
