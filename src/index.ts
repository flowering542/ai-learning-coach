// 学习教练 Agent - 主入口（支持单 Bot 多角色路由 + 题库练习 + 数据持久化）
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import * as fs from "fs";
import * as path from "path";
import {
  initStorage,
  getStudentByQQ,
  getAllStudents,
  createStudent,
  updateStudent,
  recordAnswer,
  recordWrongAnswer,
  getStudentWrongAnswers,
  getWeakPoints,
  getWeeklyProgress,
  getGlobalStats,
  backupToJSON,
  checkStorage,
  type Student,
} from "./storage.js";

// ==================== 配置区域 ====================
const ADMIN_QQ_IDS = new Set<string>([
  ...(process.env.COACH_ADMIN_QQ_IDS?.split(",").filter(Boolean) || []),
]);

const VALID_CODES = new Set([
  "STUDENT2024A", "STUDENT2024B", "STUDENT2024C",
  "COACH-DEMO-001", "COACH-DEMO-002",
]);

// ==================== 类型定义 ====================
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

// ==================== 内存缓存 ====================
let questionBank: QuestionBank | null = null;
const currentQuestions = new Map<string, Question>();

// ==================== 初始化 ====================
function init() {
  const storageStatus = checkStorage();
  if (!storageStatus.ok) {
    console.error("[Coach] 存储检查失败:", storageStatus.message);
  }
  initStorage();
  loadQuestionBank();
  console.log("[Coach] 学习教练 Agent 已加载");
  console.log("[Coach] 题库状态:", questionBank?.questions.length || 0, "题");
  console.log("[Coach] 管理员数量:", ADMIN_QQ_IDS.size);
}

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
  const student = getStudentByQQ(qqId);
  if (student) return 'student';
  return 'guest';
}

async function handleMessage(
  message: string,
  qqId: string,
  api: OpenClawPluginApi
): Promise<string> {
  const trimmed = message.trim();
  const userType = getUserType(qqId);
  
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
        return "🎯 当前模式：管理员\n\n可用命令：\n• /生成激活码\n• /学生列表\n• /统计\n• /备份";
      case "生成激活码":
      case "gen":
        const code = `STU-${Date.now().toString(36).toUpperCase().slice(-6)}`;
        VALID_CODES.add(code);
        return `✅ 新激活码：${code}\n\n将此码发给学生即可激活。`;
      case "学生列表":
        return listStudents();
      case "统计":
        return showStats();
      case "备份":
        backupToJSON();
        return "✅ 数据备份完成，已保存到 backup/ 目录。";
      default:
        return handlePersonalAssistant(message, qqId);
    }
  }
  return handlePersonalAssistant(message, qqId);
}

function handlePersonalAssistant(message: string, qqId: string): string {
  if (message.includes("天气")) return "🌤️ 今天天气不错，适合学习！";
  if (message.includes("任务")) return "📋 今日任务：\n1. 测试学习教练系统\n2. 验证题库功能\n3. 收集反馈优化";
  return `👋 管理员你好！\n\n可用命令：\n/模式 - 查看当前模式\n/生成激活码 - 创建激活码\n/学生列表 - 查看学生\n/统计 - 查看数据\n/备份 - 手动备份`;
}

// ==================== 学生模式 ====================
async function handleStudentMessage(message: string, qqId: string): Promise<string> {
  const student = getStudentByQQ(qqId);
  if (!student) return "系统错误，请重新激活。";
  
  student.lastActiveAt = new Date().toISOString();
  updateStreak(student);
  
  if (message.startsWith("/") || message.startsWith("、")) {
    const cmd = message.slice(1).split(" ")[0].toLowerCase();
    const args = message.slice(cmd.length + 2).trim();
    
    switch (cmd) {
      case "练习": case "lx":
        return await startPractice(qqId, student);
      case "错题": case "ct":
        return await startWrongPractice(qqId, student);
      case "查询": case "search":
        return await searchQuestions(args);
      case "进度": case "progress":
        return showProgress(student);
      case "帮助": case "help":
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

function updateStreak(student: Student): void {
  const today = new Date().toISOString().split('T')[0];
  const lastDate = student.lastStudyDate;
  
  if (lastDate === today) return;
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  if (lastDate === yesterdayStr) {
    student.streakDays += 1;
  } else {
    student.streakDays = 1;
  }
  
  student.lastStudyDate = today;
  updateStudent(student);
}

async function startPractice(qqId: string, student: Student): Promise<string> {
  const bank = loadQuestionBank();
  if (bank.questions.length === 0) return "❌ 题库加载失败，请稍后再试。";
  
  let question: Question;
  const weakPoints = getWeakPoints(student.id);
  
  if (weakPoints.length > 0 && Math.random() < 0.6) {
    const weak = weakPoints[Math.floor(Math.random() * weakPoints.length)];
    const found = bank.questions.find(q => q.id === weak.questionId);
    question = found || bank.questions[Math.floor(Math.random() * bank.questions.length)];
  } else {
    question = bank.questions[Math.floor(Math.random() * bank.questions.length)];
  }
  
  currentQuestions.set(qqId, question);
  student.currentQuestionId = question.id;
  updateStudent(student);
  
  return formatQuestion(question, student);
}

async function startWrongPractice(qqId: string, student: Student): Promise<string> {
  const wrongAnswers = getStudentWrongAnswers(student.id);
  if (wrongAnswers.length === 0) {
    return "🎉 还没有错题记录！先去做些练习吧。\n\n发送 /练习 开始答题。";
  }
  
  const bank = loadQuestionBank();
  const wrongIds = wrongAnswers.map(w => w.questionId);
  
  for (const wrongId of wrongIds) {
    const question = bank.questions.find(q => q.id === wrongId);
    if (question) {
      currentQuestions.set(qqId, question);
      student.currentQuestionId = question.id;
      updateStudent(student);
      
      let output = `🔄 错题复习模式\n`;
      output += `这道题你之前错了 ${wrongAnswers.find(w => w.questionId === wrongId)?.wrongCount || 1} 次\n\n`;
      output += formatQuestion(question, student, false);
      return output;
    }
  }
  
  return "❌ 错题加载失败，请稍后再试。";
}

function formatQuestion(question: Question, student: Student, showStats: boolean = true): string {
  let output = "";
  
  if (showStats) {
    const accuracy = student.totalQuestions > 0 ? Math.round((student.correctAnswers / student.totalQuestions) * 100) : 0;
    output += `📊 当前正确率：${accuracy}% | 🔥 连续${student.streakDays}天\n`;
    output += `━━━━━━━━━━━━━━━\n`;
  }
  
  output += `📝 [${getSubjectName(question.subjectId)} | ${getDifficultyLabel(question.difficulty)}]\n\n`;
  output += `${question.content}\n\n`;
  
  question.options.forEach(opt => {
    output += `${opt.id}. ${opt.text}\n`;
  });
  
  output += `\n💡 请回复 A/B/C/D 选择答案`;
  
  return output;
}

async function handleAnswer(message: string, qqId: string): Promise<string> {
  const student = getStudentByQQ(qqId);
  if (!student) return "请先发送 /练习 开始答题。";
  
  const question = currentQuestions.get(qqId);
  if (!question) return "请先发送 /练习 开始答题。";
  
  const answer = message.replace("答案", "").trim().toUpperCase();
  const isCorrect = answer === question.correctAnswer;
  
  student.totalQuestions++;
  if (isCorrect) {
    student.correctAnswers++;
  }
  updateStudent(student);
  
  recordAnswer({
    id: `ans_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    studentId: student.id,
    questionId: question.id,
    isCorrect,
    answer,
    answeredAt: new Date().toISOString(),
  });
  
  if (!isCorrect) {
    recordWrongAnswer(student.id, question.id);
  }
  
  currentQuestions.delete(qqId);
  student.currentQuestionId = undefined;
  updateStudent(student);
  
  return formatAnswerResponse(isCorrect, question, student);
}

function formatAnswerResponse(isCorrect: boolean, question: Question, student: Student): string {
  let output = "";
  
  if (isCorrect) {
    const encouragements = ["🎉 太棒了！", "✅ 回答正确！", "👏 很好！", "💪 继续保持！"];
    output += encouragements[Math.floor(Math.random() * encouragements.length)] + "\n\n";
  } else {
    const comforts = ["❌ 回答错误。", "💔 错了，没关系！", "🤔 再想想看..."];
    output += comforts[Math.floor(Math.random() * comforts.length)] + "\n\n";
    
    const wrongCount = getStudentWrongAnswers(student.id).filter(w => w.questionId === question.id).length;
    if (wrongCount >= 2) {
      output += `💡 这道题你已经错了 ${wrongCount} 次了，建议重点复习\n`;
    }
  }
  
  output += `正确答案：${question.correctAnswer}\n`;
  output += `\n📖 解析：\n${question.explanation}\n\n`;
  
  const accuracy = Math.round((student.correctAnswers / student.totalQuestions) * 100);
  output += `📊 总题数：${student.totalQuestions} | 正确率：${accuracy}% | 🔥 ${student.streakDays}天\n\n`;
  
  const weekly = getWeeklyProgress(student.id);
  if (weekly.length >= 2) {
    const lastWeek = weekly[1];
    const thisWeek = weekly[0];
    if (thisWeek.total > 0 && lastWeek.total > 0) {
      const lastAcc = Math.round((lastWeek.correct / lastWeek.total) * 100);
      const thisAcc = Math.round((thisWeek.correct / thisWeek.total) * 100);
      const diff = thisAcc - lastAcc;
      if (diff > 0) {
        output += `📈 比上周进步 ${diff}%！\n`;
      }
    }
  }
  
  output += `\n发送 /练习 继续，或 /错题 复习薄弱点`;
  
  return output;
}

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
    output += `${i + 1}. [${getSubjectName(q.subjectId)}] ${q.content.slice(0, 30)}...\n`;
  });
  
  output += `\n💡 发送 /练习 开始随机练习`;
  return output;
}

function showProgress(student: Student): string {
  const accuracy = student.totalQuestions > 0 ? Math.round((student.correctAnswers / student.totalQuestions) * 100) : 0;
  const wrongCount = getStudentWrongAnswers(student.id).length;
  const weekly = getWeeklyProgress(student.id);
  const thisWeek = weekly[0] || { correct: 0, total: 0 };
  
  return `📊 学习进度报告

👤 学员ID: ${student.id.slice(-6)}
📅 激活时间: ${new Date(student.activatedAt).toLocaleDateString()}
📝 总题数: ${student.totalQuestions}
✅ 正确数: ${student.correctAnswers}
📈 正确率: ${accuracy}%
❌ 错题数: ${wrongCount}
🔥 连续学习: ${student.streakDays}天

📅 本周进度
本周答题: ${thisWeek.total} 题
本周正确: ${thisWeek.correct} 题

继续加油！💪`;
}

function showStudentHelp(): string {
  return `📖 学习教练使用指南

【基本命令】
/练习 或 /lx - 开始练习题
/错题 或 /ct - 复习错题
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
• 系统会优先推荐薄弱点

当前题库：${loadQuestionBank().questions.length}道真题
加油！💪`;
}

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
  
  if (VALID_CODES.has(trimmed)) {
    const existing = getStudentByQQ(qqId);
    if (existing) {
      return "❌ 你已经激活过了，直接发送 /练习 开始学习。";
    }
    
    const allStudents = getAllStudents();
    const codeUsed = allStudents.find(s => s.activationCode === trimmed);
    if (codeUsed) {
      return "❌ 该激活码已被使用，请联系管理员获取新码。";
    }
    
    const student: Student = {
      id: `stu_${Date.now()}`,
      qqId,
      activatedAt: new Date().toISOString(),
      activationCode: trimmed,
      totalQuestions: 0,
      correctAnswers: 0,
      lastActiveAt: new Date().toISOString(),
      streakDays: 0,
    };
    
    createStudent(student);
    
    return `🎉 激活成功！欢迎加入学习教练系统！

你可以使用以下命令：
• /练习 - 开始练习题（${loadQuestionBank().questions.length}道真题）
• /错题 - 复习薄弱点
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
  const students = getAllStudents();
  if (students.length === 0) return "📋 暂无已激活学生。";
  
  let list = "📋 学生列表\n\n";
  students.forEach((s, i) => {
    const accuracy = s.totalQuestions > 0 ? Math.round((s.correctAnswers / s.totalQuestions) * 100) : 0;
    list += `${i + 1}. ID:${s.id.slice(-6)} 激活:${new Date(s.activatedAt).toLocaleDateString()} 正确率:${accuracy}% 🔥${s.streakDays}天\n`;
  });
  return list;
}

function showStats(): string {
  const stats = getGlobalStats();
  const bank = loadQuestionBank();
  
  return `📊 学习统计

👥 学生总数: ${stats.totalStudents}
📝 总答题数: ${stats.totalAnswers}
✅ 平均正确率: ${stats.avgAccuracy}%
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
export { handleMessage, getUserType };

// 初始化
init();
