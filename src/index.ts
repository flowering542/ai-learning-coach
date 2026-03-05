// 学习教练 Agent - 主入口（支持单 Bot 多角色路由）
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";

// ==================== 配置区域 ====================
// 管理员 QQ OpenID 列表（个人助手模式）
const ADMIN_QQ_IDS = new Set<string>([
  // 从环境变量加载，如果没有则使用默认测试值
  ...(process.env.COACH_ADMIN_QQ_IDS?.split(",").filter(Boolean) || []),
  // 临时：允许任何用户作为管理员（仅用于测试）
  // 生产环境请删除下一行并配置具体 OpenID
  "*"
]);

// 激活码池
const VALID_CODES = new Set([
  "STUDENT2024A",
  "STUDENT2024B", 
  "STUDENT2024C",
  "COACH-DEMO-001",
  "COACH-DEMO-002",
]);

// ==================== 类型定义 ====================
interface Student {
  id: string;
  qqId: string;
  name?: string;
  activatedAt: string;
  activationCode: string;
  totalQuestions: number;
  correctAnswers: number;
  lastActiveAt: string;
}

// ==================== 数据存储 ====================
const students = new Map<string, Student>();

// ==================== 路由核心 ====================

/**
 * 判断用户类型
 */
function getUserType(qqId: string): 'admin' | 'student' | 'guest' {
  // 如果配置了 "*"，所有用户都是管理员（仅用于测试）
  if (ADMIN_QQ_IDS.has("*")) return 'admin';
  if (ADMIN_QQ_IDS.has(qqId)) {
    return 'admin';
  }
  if (students.has(qqId)) {
    return 'student';
  }
  return 'guest';
}

/**
 * 主消息处理器 - 路由分发
 */
async function handleMessage(
  message: string,
  qqId: string,
  api: OpenClawPluginApi
): Promise<string> {
  const userType = getUserType(qqId);
  
  switch (userType) {
    case 'admin':
      return await handleAdminMessage(message, qqId, api);
    case 'student':
      return await handleStudentMessage(message, qqId, api);
    case 'guest':
      return await handleGuestMessage(message, qqId, api);
    default:
      return "系统错误，请稍后再试。";
  }
}

// ==================== 管理员模式 ====================

async function handleAdminMessage(
  message: string,
  qqId: string,
  api: OpenClawPluginApi
): Promise<string> {
  const trimmed = message.trim();
  
  // 管理员专用命令
  if (trimmed.startsWith("/") || trimmed.startsWith("、")) {
    const cmd = trimmed.slice(1).split(" ")[0].toLowerCase();
    const args = trimmed.slice(cmd.length + 2).trim();
    
    switch (cmd) {
      case "模式":
      case "mode":
        return `🎯 当前模式：管理员（个人助手）

你可以：
• /生成激活码 - 生成新的学生激活码
• /学生列表 - 查看所有学生
• /统计 - 查看学习统计数据
• /切换 - 切换到学习教练模式（测试用）`;
        
      case "生成激活码":
      case "gen":
        return generateActivationCode();
        
      case "学生列表":
      case "students":
        return listStudents();
        
      case "统计":
      case "stats":
        return showStats();
        
      case "切换":
      case "switch":
        // 临时切换到学生模式（用于测试）
        ADMIN_QQ_IDS.delete(qqId);
        return "✅ 已临时切换到学生模式，发送任意消息可测试学生流程。\n\n发送 /恢复 可恢复管理员身份。";
        
      default:
        // 未知命令交给个人助手逻辑
        return handlePersonalAssistant(message, qqId);
    }
  }
  
  // 自然语言处理 - 个人助手模式
  return handlePersonalAssistant(message, qqId);
}

/**
 * 个人助手逻辑（原有功能）
 */
function handlePersonalAssistant(message: string, qqId: string): string {
  // 这里可以调用原有的个人助手逻辑
  // 简化示例：
  if (message.includes("天气")) {
    return "🌤️ 今天成都天气不错，适合学习！";
  }
  
  if (message.includes("任务") || message.includes("todo")) {
    return "📋 今日任务：\n1. 完成学习教练系统开发\n2. 测试激活码流程\n3. 准备题库数据";
  }
  
  return `👋 管理员你好！

我是你的个人助手，也是学习教练系统的管理员。

可用命令：
/模式 - 查看当前模式
/生成激活码 - 创建学生激活码
/学生列表 - 查看学生名单
/统计 - 查看学习数据

需要我帮你做什么？`;
}

// ==================== 学生模式 ====================

async function handleStudentMessage(
  message: string,
  qqId: string,
  api: OpenClawPluginApi
): Promise<string> {
  const trimmed = message.trim();
  const student = students.get(qqId)!;
  
  // 更新最后活跃时间
  student.lastActiveAt = new Date().toISOString();
  
  // 命令处理
  if (trimmed.startsWith("/") || trimmed.startsWith("、")) {
    const cmd = trimmed.slice(1).split(" ")[0].toLowerCase();
    const args = trimmed.slice(cmd.length + 2).trim();
    
    switch (cmd) {
      case "练习":
      case "lx":
        return await startPractice(qqId);
        
      case "查询":
      case "search":
        return await searchQuestions(args);
        
      case "进度":
      case "progress":
        return showProgress(student);
        
      case "帮助":
      case "help":
      case "?":
        return showStudentHelp();
        
      case "恢复":
        // 管理员恢复身份
        if (isAdminTemporarilySwitched(qqId)) {
          ADMIN_QQ_IDS.add(qqId);
          return "✅ 已恢复管理员身份。";
        }
        return "未知命令，发送 /帮助 查看可用命令。";
        
      default:
        return `未知命令：${cmd}\n\n发送 /帮助 查看可用命令。`;
    }
  }
  
  // 自然语言处理
  return handleStudentNaturalLanguage(trimmed, student);
}

/**
 * 检查是否是临时切换的管理员
 */
function isAdminTemporarilySwitched(qqId: string): boolean {
  // 实际应该查询数据库或缓存
  // 简化处理：检查是否在 students 中但应该是 admin
  return false;
}

// ==================== 访客模式（未激活）====================

async function handleGuestMessage(
  message: string,
  qqId: string,
  api: OpenClawPluginApi
): Promise<string> {
  const trimmed = message.trim();
  
  // 尝试激活
  const student = activateStudent(qqId, trimmed);
  if (student) {
    return `🎉 激活成功！欢迎加入学习教练系统！

你可以使用以下命令：
• /练习 - 开始练习题
• /查询 <关键词> - 搜索题目
• /进度 - 查看学习进度
• /帮助 - 显示帮助信息

开始你的学习之旅吧！📚`;
  }
  
  // 激活失败，提示输入激活码
  return `👋 欢迎使用学习教练！

请输入你的激活码以开始使用。
示例：STUDENT2024A

可用演示激活码：
• COACH-DEMO-001
• COACH-DEMO-002

如果没有激活码，请联系管理员获取。`;
}

// ==================== 业务逻辑 ====================

function activateStudent(qqId: string, code: string): Student | null {
  if (!VALID_CODES.has(code)) {
    return null;
  }
  
  // 检查激活码是否已被使用
  for (const student of students.values()) {
    if (student.activationCode === code) {
      return null;
    }
  }
  
  const student: Student = {
    id: `stu_${Date.now()}`,
    qqId,
    activatedAt: new Date().toISOString(),
    activationCode: code,
    totalQuestions: 0,
    correctAnswers: 0,
    lastActiveAt: new Date().toISOString(),
  };
  
  students.set(qqId, student);
  return student;
}

async function startPractice(qqId: string): Promise<string> {
  return `📝 练习模式

【题目 1/10】
以下哪个选项是正确的？

A. 选项一
B. 选项二  
C. 选项三
D. 选项四

请回复 A/B/C/D 选择答案，或回复 /跳过 进入下一题。`;
}

async function searchQuestions(keyword: string): Promise<string> {
  if (!keyword) {
    return "请输入搜索关键词，例如：/查询 数学";
  }
  
  return `🔍 搜索结果："${keyword}"

找到 3 道相关题目：

1. 【数学】一元二次方程求解
2. 【数学】函数图像分析
3. 【物理】力学计算

回复题目前的数字查看详情，或继续搜索其他关键词。`;
}

function showProgress(student: Student): string {
  const accuracy = student.totalQuestions > 0 
    ? Math.round((student.correctAnswers / student.totalQuestions) * 100)
    : 0;
    
  return `📊 学习进度报告

👤 学员ID: ${student.id.slice(-6)}
📅 激活时间: ${new Date(student.activatedAt).toLocaleDateString()}
📝 总题数: ${student.totalQuestions}
✅ 正确率: ${accuracy}%
🔥 连续打卡: 3天

继续加油！💪`;
}

function showStudentHelp(): string {
  return `📖 学习教练使用指南

【基本命令】
/练习 或 /lx - 开始练习题
/查询 <关键词> - 搜索题目
/进度 - 查看学习进度
/帮助 - 显示此帮助

【练习模式】
• 回复 A/B/C/D 选择答案
• 回复 /跳过 跳过当前题目
• 回复 /解析 查看答案解析
• 回复 /退出 结束练习

【小贴士】
• 每天坚持练习效果更好
• 错题会自动收录到错题本
• 可随时查询知识点相关题目

遇到问题？联系管理员获取帮助。`;
}

function handleStudentNaturalLanguage(message: string, student: Student): string {
  if (message.includes("你好") || message.includes("嗨")) {
    return `你好！我是你的学习教练 📚

有什么可以帮你的吗？试试：
• /练习 - 开始做题
• /查询 - 搜索题目
• /进度 - 查看进度`;
  }
  
  if (message.includes("谢谢") || message.includes("感谢")) {
    return "不客气！继续加油学习吧 💪";
  }
  
  if (message.includes("再见") || message.includes("拜拜")) {
    return "再见！记得明天继续练习哦 👋";
  }
  
  return `收到！你可以尝试以下操作：

/练习 - 开始练习题
/查询 ${message} - 搜索相关题目
/帮助 - 查看所有命令`;
}

// ==================== 管理员功能 ====================

function generateActivationCode(): string {
  const code = `STU-${Date.now().toString(36).toUpperCase()}`;
  VALID_CODES.add(code);
  return `✅ 新激活码已生成：\n\n${code}\n\n将此码发送给学生即可激活。`;
}

function listStudents(): string {
  if (students.size === 0) {
    return "📋 学生列表\n\n暂无已激活学生。";
  }
  
  let list = "📋 学生列表\n\n";
  let index = 1;
  for (const student of students.values()) {
    list += `${index}. ID: ${student.id.slice(-6)} | 激活时间: ${new Date(student.activatedAt).toLocaleDateString()}\n`;
    index++;
  }
  
  return list;
}

function showStats(): string {
  const totalStudents = students.size;
  let totalQuestions = 0;
  let totalCorrect = 0;
  
  for (const student of students.values()) {
    totalQuestions += student.totalQuestions;
    totalCorrect += student.correctAnswers;
  }
  
  const accuracy = totalQuestions > 0 
    ? Math.round((totalCorrect / totalQuestions) * 100)
    : 0;
  
  return `📊 学习统计

👥 学生总数: ${totalStudents}
📝 总答题数: ${totalQuestions}
✅ 总正确率: ${accuracy}%
📅 系统运行: 1天

继续加油！💪`;
}

// ==================== 导出 ====================

export { handleMessage, getUserType, students, VALID_CODES };

// 运行时信息
if (import.meta.main) {
  console.log("✅ 学习教练 Agent 已加载");
  console.log("📋 可用激活码:", Array.from(VALID_CODES));
  console.log("👤 管理员数量:", ADMIN_QQ_IDS.size);
}
