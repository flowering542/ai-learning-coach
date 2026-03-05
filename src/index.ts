// 学习教练 Agent - 主入口（支持单 Bot 多角色路由 + 题库练习）
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import * as fs from "fs";
import * as path from "path";

// ==================== 配置区域 ====================
const ADMIN_QQ_IDS = new Set<string>([
  ...(process.env.COACH_ADMIN_QQ_IDS?.split(",").filter(Boolean) || []),
]);

const VALID_CODES = new Set([
  "STUDENT2024A", "STUDENT2024B", "STUDENT2024C",
  "COACH-DEMO-001", "COACH-DEMO-002",
]);

// ==================== 类型定义 ====================
interface Student {
  id: string;
  qqId: string;
  activatedAt: string;
  activationCode: string;
  totalQuestions: number;
  correctAnswers: number;
  lastActiveAt: string;
  currentQuestion?: Question; // 当前练习题目
  wrongQuestions: string[]; // 错题记录
}

interface Question {
  id: string;
  subjectId: string;
  type: string;
  difficulty: string;
  content: string;
  options: { id: string; text: string }[];
  correctAnswer: string;
  explanation: string;
}

interface QuestionBank {
  metadata: any;
  subjects: any[];
  questions: Question[];
}

// ==================== 数据存储 ====================
const students = new Map<string, Student>();
let questionBank: QuestionBank | null = null;

// ==================== 加载题库 ====================
function loadQuestionBank(): QuestionBank {
  if (questionBank) return questionBank;
  
  try {
    const dataPath = path.join(__dirname, "..", "data", "questions.json");
    const data = fs.readFileSync(dataPath, "utf-8");
    questionBank = JSON.parse(data);
    console.log(`[Coach] 题库加载成功，共 ${questionBank!.questions.length} 题`);
    return questionBank!;
  } catch (e) {
    console.error("[Coach] 题库加载失败:", e);
    return { metadata: {}, subjects: [], questions: [] };
  }
}

// ==================== 路由核心 ====================
function getUserType(qqId: string): 'admin' | 'student' | 'guest' {
  if (ADMIN_QQ_IDS.has(qqId)) return 'admin';
  if (students.has(qqId)) return 'student';
  return 'guest';
}

async function handleMessage(
  message: string,
  qqId: string,
  api: OpenClawPluginApi
): Promise<string> {
  const trimmed = message.trim();
  const userType = getUserType(qqId);
  
  // 检查是否是答题（学生模式）
  if (userType === 'student' && isAnswer(trimmed)) {
    return await handleAnswer(trimmed, qqId);
  }
  
  switch (userType) {
    case 'admin':
      return await handleAdminMessage(trimmed, qqId);
    case 'student':
      return await handleStudentMessage(trimmed, qqId);
    case 'guest':
      return await handleGuestMessage(trimmed, qqId);
    default:
      return "系统错误，请稍后再试。";
  }
}

function isAnswer(message: string): boolean {
  return /^[A-Da-d]$/.test(message.trim()) || message.startsWith("答案");
}

// ==================== 管理员模式 ====================
async function handleAdminMessage(message: string, qqId: string): Promise<string> {
  if (message.startsWith("/") || message.startsWith("、")) {
    const cmd = message.slice(1).split(" ")[0].toLowerCase();
    
    switch (cmd) {
      case "模式":
        return "🎯 当前模式：管理员\n\n可用命令：\n• /生成激活码\n• /学生列表\n• /统计\n• /切换（测试学生模式）";
      case "生成激活码":
      case "gen":
        const code = `STU-${Date.now().toString(36).toUpperCase().slice(-6)}`;
        VALID_CODES.add(code);
        return `✅ 新激活码：${code}\n\n将此码发给学生即可激活。`;
      case "学生列表":
        return listStudents();
      case "统计":
        return showStats();
      case "切换":
        ADMIN_QQ_IDS.delete(qqId);
        return "✅ 已切换到学生模式，发送 /恢复 可恢复管理员身份。";
      default:
        return handlePersonalAssistant(message, qqId);
    }
  }
  return handlePersonalAssistant(message, qqId);
}

function handlePersonalAssistant(message: string, qqId: string): string {
  if (message.includes("天气")) return "🌤️ 今天天气不错，适合学习！";
  if (message.includes("任务")) return "📋 今日任务：\n1. 测试学习教练系统\n2. 验证题库功能\n3. 收集反馈优化";
  return `👋 管理员你好！\n\n可用命令：\n/模式 - 查看当前模式\n/生成激活码 - 创建激活码\n/学生列表 - 查看学生\n/统计 - 查看数据`;
}

// ==================== 学生模式（核心练习功能）====================
async function handleStudentMessage(message: string, qqId: string): Promise<string> {
  const student = students.get(qqId)!;
  student.lastActiveAt = new Date().toISOString();
  
  if (message.startsWith("/") || message.startsWith("、")) {
    const cmd = message.slice(1).split(" ")[0].toLowerCase();
    const args = message.slice(cmd.length + 2).trim();
    
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
        return showStudentHelp();
      case "恢复":
        if (process.env.COACH_ADMIN_QQ_IDS?.includes(qqId)) {
          ADMIN_QQ_IDS.add(qqId);
          return "✅ 已恢复管理员身份。";
        }
        return "未知命令，发送 /帮助 查看可用命令。";
      default:
        return `未知命令：${cmd}\n\n发送 /帮助 查看可用命令。`;
    }
  }
  
  return handleStudentNaturalLanguage(message, student);
}

// 开始练习 - 核心功能
async function startPractice(qqId: string): Promise<string> {
  const bank = loadQuestionBank();
  if (bank.questions.length === 0) {
    return "❌ 题库加载失败，请稍后再试。";
  }
  
  const student = students.get(qqId)!;
  
  // 随机选择一道题
  const randomIndex = Math.floor(Math.random() * bank.questions.length);
  const question = bank.questions[randomIndex];
  
  // 保存当前题目
  student.currentQuestion = question;
  
  // 格式化题目
  let output = `📝 练习题 [${question.id}]\n`;
  output += `【${getSubjectName(question.subjectId)} | ${getDifficultyLabel(question.difficulty)}】\n\n`;
  output += `${question.content}\n\n`;
  
  question.options.forEach(opt => {
    output += `${opt.id}. ${opt.text}\n`;
  });
  
  output += `\n💡 请回复 A/B/C/D 选择答案\n`;
  output += `📝 回复 /跳过 换一题`;
  
  return output;
}

// 处理答案
async function handleAnswer(message: string, qqId: string): Promise<string> {
  const student = students.get(qqId);
  if (!student || !student.currentQuestion) {
    return "请先发送 /练习 开始答题。";
  }
  
  const question = student.currentQuestion;
  const answer = message.replace("答案", "").trim().toUpperCase();
  
  student.totalQuestions++;
  
  const isCorrect = answer === question.correctAnswer;
  
  if (isCorrect) {
    student.correctAnswers++;
  } else {
    student.wrongQuestions.push(question.id);
  }
  
  // 构建回复
  let output = isCorrect ? "✅ 回答正确！\n\n" : "❌ 回答错误！\n\n";
  output += `正确答案：${question.correctAnswer}\n`;
  output += `\n📖 解析：\n${question.explanation}\n\n`;
  
  // 显示统计
  const accuracy = Math.round((student.correctAnswers / student.totalQuestions) * 100);
  output += `📊 当前正确率：${accuracy}% (${student.correctAnswers}/${student.totalQuestions})\n\n`;
  output += `发送 /练习 继续下一题，或 /帮助 查看其他功能。`;
  
  // 清除当前题目
  student.currentQuestion = undefined;
  
  return output;
}

// 搜索题目
async function searchQuestions(keyword: string): Promise<string> {
  if (!keyword) {
    return "请输入搜索关键词，例如：/查询 ABO血型";
  }
  
  const bank = loadQuestionBank();
  const results = bank.questions.filter(q => 
    q.content.includes(keyword) || 
    q.explanation.includes(keyword)
  ).slice(0, 5);
  
  if (results.length === 0) {
    return `🔍 未找到包含"${keyword}"的题目。\n\n试试其他关键词：血型、输血、溶血...`;
  }
  
  let output = `🔍 "${keyword}" 的搜索结果：\n\n`;
  results.forEach((q, i) => {
    output += `${i + 1}. [${q.id}] ${q.content.slice(0, 30)}...\n`;
  });
  
  output += `\n💡 发送 /练习 开始随机练习`;
  return output;
}

// 显示学习进度
function showProgress(student: Student): string {
  const accuracy = student.totalQuestions > 0 
    ? Math.round((student.correctAnswers / student.totalQuestions) * 100)
    : 0;
  
  return `📊 学习进度报告

👤 学员ID: ${student.id.slice(-6)}
📅 激活时间: ${new Date(student.activatedAt).toLocaleDateString()}
📝 总题数: ${student.totalQuestions}
✅ 正确数: ${student.correctAnswers}
📈 正确率: ${accuracy}%
❌ 错题数: ${student.wrongQuestions.length}
🔥 连续学习: 1天

继续加油！💪`;
}

// 显示帮助
function showStudentHelp(): string {
  return `📖 学习教练使用指南

【基本命令】
/练习 或 /lx - 开始练习题
/查询 <关键词> - 搜索题目
/进度 - 查看学习进度
/帮助 - 显示此帮助

【练习模式】
• 回复 A/B/C/D 选择答案
• 查看解析和正确答案
• 自动统计正确率

【学习建议】
• 每天坚持练习10-20题
• 错题会自动记录
• 可搜索薄弱知识点针对性练习

当前题库：232道真题
加油！💪`;
}

// 自然语言处理
function handleStudentNaturalLanguage(message: string, student: Student): string {
  if (message.includes("你好")) {
    return `你好！我是你的学习教练 📚

今天想练习吗？发送 /练习 开始做题！`;
  }
  if (message.includes("谢谢")) return "不客气！继续加油学习吧 💪";
  if (message.includes("再见")) return "再见！记得明天继续练习哦 👋";
  
  return `收到！你可以：

/练习 - 开始练习题
/查询 ${message} - 搜索相关题目
/帮助 - 查看所有命令`;
}

// ==================== 访客模式 ====================
async function handleGuestMessage(message: string, qqId: string): Promise<string> {
  const trimmed = message.trim();
  
  // 尝试激活
  if (VALID_CODES.has(trimmed)) {
    // 检查是否已被使用
    for (const s of students.values()) {
      if (s.activationCode === trimmed) {
        return "❌ 该激活码已被使用，请联系管理员获取新码。";
      }
    }
    
    const student: Student = {
      id: `stu_${Date.now()}`,
      qqId,
      activatedAt: new Date().toISOString(),
      activationCode: trimmed,
      totalQuestions: 0,
      correctAnswers: 0,
      lastActiveAt: new Date().toISOString(),
      wrongQuestions: [],
    };
    students.set(qqId, student);
    
    return `🎉 激活成功！欢迎加入学习教练系统！

你可以使用以下命令：
• /练习 - 开始练习题（232道真题）
• /查询 <关键词> - 搜索题目
• /进度 - 查看学习进度
• /帮助 - 显示帮助信息

开始你的学习之旅吧！📚`;
  }
  
  return `👋 欢迎使用学习教练！

请输入你的激活码以开始使用。

示例激活码：
• COACH-DEMO-001
• COACH-DEMO-002

没有激活码？联系管理员获取。`;
}

// ==================== 辅助函数 ====================
function listStudents(): string {
  if (students.size === 0) return "📋 暂无已激活学生。";
  
  let list = "📋 学生列表\n\n";
  let i = 1;
  for (const s of students.values()) {
    const accuracy = s.totalQuestions > 0 
      ? Math.round((s.correctAnswers / s.totalQuestions) * 100)
      : 0;
    list += `${i}. ID:${s.id.slice(-6)} 激活:${new Date(s.activatedAt).toLocaleDateString()} 正确率:${accuracy}%\n`;
    i++;
  }
  return list;
}

function showStats(): string {
  const totalStudents = students.size;
  let totalQ = 0, totalC = 0;
  
  for (const s of students.values()) {
    totalQ += s.totalQuestions;
    totalC += s.correctAnswers;
  }
  
  const acc = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;
  const bank = loadQuestionBank();
  
  return `📊 学习统计

👥 学生总数: ${totalStudents}
📝 总答题数: ${totalQ}
✅ 总正确率: ${acc}%
📚 题库总量: ${bank.questions.length}题
📅 系统运行: 正常

继续加油！💪`;
}

function getSubjectName(subjectId: string): string {
  const names: Record<string, string> = {
    "blood_basic": "血液学基础",
    "transfusion_theory": "输血理论",
    "blood_test": "输血前检测",
    "clinical_transfusion": "临床输血",
    "transfusion_reaction": "输血不良反应",
    "blood_quality": "质量管理",
    "immunohematology": "免疫血液学"
  };
  return names[subjectId] || "其他";
}

function getDifficultyLabel(difficulty: string): string {
  const labels: Record<string, string> = {
    "easy": "简单",
    "medium": "中等",
    "hard": "困难"
  };
  return labels[difficulty] || "未知";
}

// ==================== 导出 ====================
export { handleMessage, getUserType, students, VALID_CODES };

// 运行时信息
if (import.meta.main) {
  console.log("✅ 学习教练 Agent 已加载");
  console.log("📚 题库状态:", loadQuestionBank().questions.length, "题");
  console.log("👤 管理员数量:", ADMIN_QQ_IDS.size);
}
