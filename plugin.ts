// Coach Agent Plugin for OpenClaw
// 学习教练 Agent - v3.0 用户中心版

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import * as fs from 'fs';
import * as path from 'path';

// ==================== 配置区域 ====================
const DATA_DIR = process.env.COACH_DATA_DIR || './data';

const ADMIN_QQ_IDS = new Set<string>([
  ...(process.env.COACH_ADMIN_QQ_IDS?.split(",") || []),
]);

const VALID_CODES = new Set<string>([
  "STUDENT2024A",
  "STUDENT2024B", 
  "STUDENT2024C",
  "COACH-DEMO-001",
  "COACH-DEMO-002",
]);

// ==================== 数据持久化 ====================

// 确保数据目录存在
function ensureDataDir(): void {
  const dir = path.join(DATA_DIR, 'students');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 获取用户数据文件路径
function getUserFilePath(qqId: string): string {
  return path.join(DATA_DIR, 'students', `${qqId}.json`);
}

// 加载用户数据
function loadUserData(qqId: string): Student | null {
  try {
    const filePath = getUserFilePath(qqId);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('[Coach] 加载用户数据失败:', e);
  }
  return null;
}

// 保存用户数据到文件
function saveUserDataToFile(qqId: string, student: Student): void {
  try {
    ensureDataDir();
    const filePath = getUserFilePath(qqId);
    fs.writeFileSync(filePath, JSON.stringify(student, null, 2));
  } catch (e) {
    console.error('[Coach] 保存用户数据失败:', e);
  }
}

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
  // 智能出题需要的数据
  questionHistory: QuestionHistory[];
  currentDifficulty: 'easy' | 'medium' | 'hard';
}

// 答题历史
interface QuestionHistory {
  questionId: string;
  isCorrect: boolean;
  timestamp: string;
  subjectId?: string;
}

// 答题状态管理
interface QuestionState {
  currentQuestion: {
    id: string;
    content: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    extend?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    subjectId?: string;
  } | null;
  lastQuestion: {
    id: string;
    content: string;
    correctAnswer: string;
    explanation: string;
    extend?: string;
    isCorrect: boolean;
  } | null;
  waitingForContinue: boolean;
}

// ==================== 数据存储 ====================
const students = new Map<string, Student>();
const questionStates = new Map<string, QuestionState>();

// 模拟题库（带难度和主题）
const questionBank: Array<{
  id: string;
  content: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  extend?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  subjectId: string;
}> = [
  {
    id: "q001",
    content: "输血前检查，下列哪项是必查项目？",
    options: ["ABO血型鉴定", "肝功能检查", "肾功能检查", "血糖检测"],
    correctAnswer: "1",
    explanation: "ABO血型鉴定是输血前必查项目，确保血型匹配避免溶血反应。",
    extend: "📚 扩展：除ABO血型外，Rh血型鉴定也很重要，特别是Rh阴性患者。输血前还需进行交叉配血试验，确保供血者和受血者血液相容。",
    difficulty: "easy" as const,
    subjectId: "blood_type"
  },
  {
    id: "q002", 
    content: "治疗性红细胞去除术适用于",
    options: ["真性红细胞增多症", "缺铁性贫血", "再生障碍性贫血", "急性失血"],
    correctAnswer: "1",
    explanation: "真性红细胞增多症是红细胞异常增多，需要去除多余红细胞。",
    extend: "📚 扩展：治疗性血液成分去除术还包括血小板去除术（用于原发性血小板增多症）、白细胞去除术（用于高白细胞血症）等。",
    difficulty: "medium" as const,
    subjectId: "therapeutic_apheresis"
  },
  {
    id: "q003",
    content: "慢性贫血患者输血的红细胞输注指征是Hb低于",
    options: ["50g/L", "60g/L", "70g/L", "80g/L"],
    correctAnswer: "2",
    explanation: "慢性贫血患者Hb<60g/L且伴有明显缺氧症状时应考虑输血。",
    extend: "📚 扩展：急性失血患者的输血指征不同，通常Hb<70g/L或出现明显休克症状时需要输血。老年人和心血管疾病患者的输血指征可适当放宽。",
    difficulty: "medium" as const,
    subjectId: "transfusion_indication"
  },
  {
    id: "q004",
    content: "ABO血型系统中，O型血的人红细胞上有什么抗原？",
    options: ["A抗原", "B抗原", "A和B抗原", "无抗原"],
    correctAnswer: "4",
    explanation: "O型血的人红细胞上无A、B抗原，血浆中有抗A和抗B抗体。",
    extend: "📚 扩展：ABO血型系统是根据红细胞表面是否存在A、B抗原来划分的。A型有A抗原，B型有B抗原，AB型有A和B抗原，O型无抗原。",
    difficulty: "easy" as const,
    subjectId: "blood_type"
  },
  {
    id: "q005",
    content: "交叉配血试验的主要目的是",
    options: ["确定血型", "检测抗体", "检测受血者血清与供血者红细胞是否相容", "检测细菌污染"],
    correctAnswer: "3",
    explanation: "交叉配血试验是检测受血者血清与供血者红细胞是否相容，确保输血安全。",
    extend: "📚 扩展：交叉配血包括主侧（受血者血清+供血者红细胞）和次侧（供血者血清+受血者红细胞）试验，两者都必须无凝集才能输血。",
    difficulty: "hard" as const,
    subjectId: "compatibility_testing"
  }
];

// ==================== 路由核心 ====================
function getUserType(qqId: string): 'admin' | 'student' | 'guest' {
  if (ADMIN_QQ_IDS.has(qqId)) return 'admin';
  
  // 先检查内存
  if (students.has(qqId)) return 'student';
  
  // 再检查文件
  const userData = loadUserData(qqId);
  if (userData) {
    students.set(qqId, userData);
    return 'student';
  }
  
  return 'guest';
}

// ==================== 消息处理器 ====================
async function handleMessage(
  message: string,
  qqId: string,
  api: OpenClawPluginApi
): Promise<string> {
  const userType = getUserType(qqId);
  
  switch (userType) {
    case 'admin':
      return await handleAdminMessage(message, qqId);
    case 'student':
      return await handleStudentMessage(message, qqId);
    case 'guest':
      return await handleGuestMessage(message, qqId);
    default:
      return "系统错误，请稍后再试。";
  }
}

// ==================== 管理员模式 ====================
async function handleAdminMessage(message: string, qqId: string): Promise<string> {
  const trimmed = message.trim();
  
  if (trimmed.startsWith("/") || trimmed.startsWith("、")) {
    const cmd = trimmed.slice(1).split(" ")[0].toLowerCase();
    
    switch (cmd) {
      case "模式":
      case "mode":
        return `🎯 当前模式：管理员（个人助手）\n\n可用命令：\n• /生成激活码 - 创建学生激活码\n• /学生列表 - 查看学生名单\n• /统计 - 查看学习数据\n• /切换 - 切换到学生模式测试`;
        
      case "生成激活码":
      case "gen":
        const newCode = `STU-${Date.now().toString(36).toUpperCase()}`;
        VALID_CODES.add(newCode);
        return `✅ 新激活码：${newCode}\n\n将此码发送给学生即可激活。`;
        
      case "学生列表":
      case "students":
        if (students.size === 0) return "📋 暂无已激活学生。";
        let list = "📋 学生列表\n\n";
        let i = 1;
        Array.from(students.values()).forEach(s => {
          list += `${i}. ID:${s.id.slice(-6)} 激活:${new Date(s.activatedAt).toLocaleDateString()}\n`;
          i++;
        });
        return list;
        
      case "统计":
      case "stats":
        let totalQ = 0, totalC = 0;
        Array.from(students.values()).forEach(s => {
          totalQ += s.totalQuestions;
          totalC += s.correctAnswers;
        });
        const acc = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;
        return `📊 统计\n\n👥 学生: ${students.size}\n📝 答题: ${totalQ}\n✅ 正确率: ${acc}%`;
        
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
  if (message.includes("任务")) return "📋 今日任务：\n1. 完成学习教练系统\n2. 测试激活码流程\n3. 准备题库数据";
  
  return `👋 管理员你好！\n\n可用命令：\n/模式 - 查看当前模式\n/生成激活码 - 创建激活码
/学生列表 - 查看学生\n/统计 - 查看数据`;
}

// ==================== 学生模式（v3.0 用户中心版） ====================
async function handleStudentMessage(message: string, qqId: string): Promise<string> {
  const trimmed = message.trim().toLowerCase();
  const student = students.get(qqId);
  if (!student) return "请先发送激活码激活账号。";
  
  student.lastActiveAt = new Date().toISOString();
  
  // 获取或初始化答题状态
  let state = questionStates.get(qqId);
  if (!state) {
    state = { currentQuestion: null, lastQuestion: null, waitingForContinue: false };
    questionStates.set(qqId, state);
  }
  
  // 如果正在等待用户说"继续"
  if (state.waitingForContinue) {
    // 用户说继续/下一题
    if (/^(继续|下一题|jt|xyt)$/.test(trimmed)) {
      state.waitingForContinue = false;
      return generateQuestion(qqId, student);
    }
    
    // 用户说其他内容 → 引导思考，然后给解释
    return guideAndTeach(message, qqId, state, student);
  }
  
  // 检查是否在答题（回复 1-4）
  if (state.currentQuestion && /^[1-4]$/.test(trimmed)) {
    return handleAnswer(trimmed, qqId, state, student);
  }
  
  // 命令处理
  if (trimmed.startsWith("/") || trimmed.startsWith("、")) {
    const cmd = trimmed.slice(1).split(" ")[0].toLowerCase();
    
    switch (cmd) {
      case "练习":
      case "lx":
      case "开始":
        return generateQuestion(qqId, student);
        
      case "进度":
      case "progress":
        const acc = student.totalQuestions > 0 
          ? Math.round((student.correctAnswers / student.totalQuestions) * 100)
          : 0;
        return `📊 学习进度\n\n👤 ID: ${student.id.slice(-6)}\n📝 总题数: ${student.totalQuestions}\n✅ 正确率: ${acc}%\n🔥 连续打卡: 3天`;
        
      case "错题":
      case "ct":
        return handleWrongQuestions(student);
        
      case "帮助":
      case "help":
        return `📖 学习教练\n\n/练习 - 开始练习题\n/错题 - 查看错题本\n/进度 - 查看进度\n/帮助 - 显示帮助\n\n答题时回复 1/2/3/4`;
        
      default:
        return `未知命令：${cmd}\n\n发送 /帮助 查看可用命令。`;
    }
  }
  
  // 自然语言
  if (message.includes("你好")) return "你好！我是学习教练 📚\n\n试试：/练习";
  
  return `收到！发送 /练习 开始练习题`;
}

// 生成新题目（智能出题）
function generateQuestion(qqId: string, student: Student): string {
  const state = questionStates.get(qqId)!;
  
  // 智能选择题目
  const question = selectSmartQuestion(student);
  
  state.currentQuestion = question;
  state.waitingForContinue = false;
  
  // 显示难度和主题
  const diffMap = { easy: '简单', medium: '中等', hard: '困难' };
  const diffText = diffMap[question.difficulty || 'medium'];
  
  // 显示统计（如果有答题记录）
  let stats = "";
  if (student.totalQuestions > 0) {
    const acc = Math.round((student.correctAnswers / student.totalQuestions) * 100);
    stats = `📊 已答${student.totalQuestions}题，正确率${acc}% | 难度：${diffText}\n\n`;
  } else {
    stats = `📊 难度：${diffText}\n\n`;
  }
  
  return `${stats}📝 ${question.content}\n\n${question.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}\n\n回复 1/2/3/4`;
}

// 处理答题（v3.0 - 用户中心版）
function handleAnswer(answer: string, qqId: string, state: QuestionState, student: Student): string {
  if (!state.currentQuestion) return "请先发送 /练习 开始答题";
  
  const question = state.currentQuestion;
  const isCorrect = answer === question.correctAnswer;
  
  // 更新统计
  student.totalQuestions++;
  if (isCorrect) student.correctAnswers++;
  
  // 保存到lastQuestion
  state.lastQuestion = {
    id: question.id,
    content: question.content,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    extend: question.extend,
    isCorrect: isCorrect
  };
  
  // 记录答题历史
  if (!student.questionHistory) student.questionHistory = [];
  student.questionHistory.push({
    questionId: question.id,
    isCorrect: isCorrect,
    timestamp: new Date().toISOString(),
    subjectId: question.subjectId
  });
  
  // 更新难度
  updateDifficulty(student);
  
  // 清除当前题目，设置等待状态
  state.currentQuestion = null;
  state.waitingForContinue = true;
  questionStates.set(qqId, state);
  saveUserData(qqId, student);
  
  const acc = Math.round((student.correctAnswers / student.totalQuestions) * 100);
  
  // 答对：直接出下一题（高效）
  if (isCorrect) {
    const nextQuestion = generateQuestion(qqId, student);
    let reply = `✅ 对了！\n\n💡 ${question.explanation}\n\n`;
    if (question.extend) {
      reply += `${question.extend}\n\n`;
    }
    reply += `📊 已答${student.totalQuestions}题，正确率${acc}%\n\n${nextQuestion}`;
    return reply;
  }
  
  // 答错：给解析+扩展，等待用户说"继续"
  const guide = generateGuide(question);
  
  let reply = `❌ 错了！\n\n${guide}\n\n`;
  reply += `💡 正确答案是：${question.correctAnswer}\n\n`;
  reply += `${question.explanation}\n\n`;
  if (question.extend) {
    reply += `${question.extend}\n\n`;
  }
  reply += `📊 已答${student.totalQuestions}题，正确率${acc}%\n\n回复"继续"出下一题`;
  return reply;
}

// 处理错题本
function handleWrongQuestions(student: Student): string {
  const wrongHistory = student.questionHistory?.filter(h => !h.isCorrect) || [];
  
  if (wrongHistory.length === 0) {
    return "🎉 还没有错题，继续保持！\n\n发送 /练习 开始针对性练习";
  }
  
  // 统计错题
  const wrongCount = wrongHistory.length;
  const uniqueWrongIds = new Set(wrongHistory.map(h => h.questionId));
  
  let reply = `📝 错题本\n`;
  reply += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  reply += `📊 统计：共 ${wrongCount} 次错题，${uniqueWrongIds.size} 道不同题目\n\n`;
  
  // 按主题分组
  const subjectCount: Record<string, number> = {};
  wrongHistory.forEach(h => {
    if (h.subjectId) {
      subjectCount[h.subjectId] = (subjectCount[h.subjectId] || 0) + 1;
    }
  });
  
  if (Object.keys(subjectCount).length > 0) {
    reply += `📚 薄弱知识点：\n`;
    Object.entries(subjectCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([subject, count]) => {
        reply += `  • ${subject}：${count}次\n`;
      });
    reply += `\n`;
  }
  
  reply += `💡 发送 /练习 开始针对性练习\n`;
  reply += `━━━━━━━━━━━━━━━━━━━━`;
  
  return reply;
}

// 引导思考 - AI自由发挥（根据题目内容）
function generateGuide(question: typeof questionBank[0]): string {
  // 根据题目关键词生成个性化引导
  const content = question.content;
  
  if (content.includes('血型')) {
    return "💡 想想：血型不匹配会有什么后果？临床上最担心什么情况？🤔";
  }
  if (content.includes('去除') || content.includes('增多')) {
    return "💡 思考一下：什么情况下需要'去除'血液成分？是太多还是太少？🤔";
  }
  if (content.includes('输血') && content.includes('指征')) {
    return "💡 考虑一下：慢性贫血和急性失血的输血标准一样吗？关键区别是什么？🤔";
  }
  if (content.includes('交叉配血')) {
    return "💡 想想：交叉配血和单纯测血型有什么区别？为什么要'交叉'？🤔";
  }
  
  // 默认引导
  return "💡 思考一下：这道题的核心概念是什么？和临床实际有什么联系？🤔";
}

// 用户说"继续"后出下一题
function guideAndTeach(message: string, qqId: string, state: QuestionState, student: Student): string {
  // 用户说"继续"，直接出下一题
  state.waitingForContinue = false;
  return generateQuestion(qqId, student);
}

// 保存用户数据（内存+文件）
function saveUserData(qqId: string, student: Student): void {
  // 更新内存
  students.set(qqId, student);
  // 持久化到文件
  saveUserDataToFile(qqId, student);
}

// ==================== 访客模式 ====================
async function handleGuestMessage(message: string, qqId: string): Promise<string> {
  const trimmed = message.trim();
  
  // 尝试激活
  if (VALID_CODES.has(trimmed)) {
    const isUsed = Array.from(students.values()).some(s => s.activationCode === trimmed);
    if (isUsed) {
      return "❌ 该激活码已被使用。";
    }
    
    const student: Student = {
      id: `stu_${Date.now()}`,
      qqId,
      activatedAt: new Date().toISOString(),
      activationCode: trimmed,
      totalQuestions: 0,
      correctAnswers: 0,
      lastActiveAt: new Date().toISOString(),
      questionHistory: [],
      currentDifficulty: 'easy',
    };
    students.set(qqId, student);
    saveUserDataToFile(qqId, student); // 持久化
    
    return `🎉 激活成功！\n\n/练习 - 开始练习题\n/进度 - 查看进度`;
  }
  
  return `👋 请输入激活码：\n\n演示码：COACH-DEMO-001`;
}

// ==================== 智能出题策略 ====================

// 智能选择题目
function selectSmartQuestion(student: Student): typeof questionBank[0] {
  const history = student.questionHistory || [];
  
  // 获取已做对的题目ID
  const correctQuestionIds = new Set(
    history.filter(h => h.isCorrect).map(h => h.questionId)
  );
  
  // 获取做错的题目ID（用于复习）
  const wrongQuestionIds = new Set(
    history.filter(h => !h.isCorrect).map(h => h.questionId)
  );
  
  // 1. 优先出未做过的题（学习新知）
  const unansweredQuestions = questionBank.filter(q => 
    !correctQuestionIds.has(q.id) && !wrongQuestionIds.has(q.id)
  );
  
  if (unansweredQuestions.length > 0) {
    // 按难度筛选
    const candidates = unansweredQuestions.filter(q => 
      q.difficulty === student.currentDifficulty
    );
    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
    // 该难度没有未做题，返回所有未做题
    return unansweredQuestions[Math.floor(Math.random() * unansweredQuestions.length)];
  }
  
  // 2. 所有题都做过了，优先复习错题
  const wrongQuestions = history.filter(h => !h.isCorrect);
  if (wrongQuestions.length > 0) {
    // 找出错误最多的主题
    const subjectCount: Record<string, number> = {};
    wrongQuestions.forEach(h => {
      if (h.subjectId) {
        subjectCount[h.subjectId] = (subjectCount[h.subjectId] || 0) + 1;
      }
    });
    
    // 找出最薄弱的主题
    let weakestSubject = '';
    let maxCount = 0;
    for (const [subject, count] of Object.entries(subjectCount)) {
      if (count > maxCount) {
        maxCount = count;
        weakestSubject = subject;
      }
    }
    
    // 从最薄弱主题中选做错的题复习
    if (weakestSubject) {
      const wrongIds = wrongQuestions.map(h => h.questionId);
      const candidates = questionBank.filter(q => 
        wrongIds.includes(q.id) && 
        q.subjectId === weakestSubject
      );
      if (candidates.length > 0) {
        return candidates[Math.floor(Math.random() * candidates.length)];
      }
    }
    
    // 随机选一道错题复习
    const wrongIds = wrongQuestions.map(h => h.questionId);
    const candidates = questionBank.filter(q => wrongIds.includes(q.id));
    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
  }
  
  // 3. 所有题都做对了，随机出题（理论上不会到这里）
  return questionBank[Math.floor(Math.random() * questionBank.length)];
}

// 更新难度
function updateDifficulty(student: Student): void {
  const recentHistory = student.questionHistory.slice(-10); // 最近10题
  if (recentHistory.length < 5) return; // 数据不足
  
  const correctCount = recentHistory.filter(h => h.isCorrect).length;
  const accuracy = correctCount / recentHistory.length;
  
  // 正确率>80%升级，<50%降级
  if (accuracy > 0.8 && student.currentDifficulty !== 'hard') {
    student.currentDifficulty = student.currentDifficulty === 'easy' ? 'medium' : 'hard';
  } else if (accuracy < 0.5 && student.currentDifficulty !== 'easy') {
    student.currentDifficulty = student.currentDifficulty === 'hard' ? 'medium' : 'easy';
  }
}

// 加载所有学生数据
function loadAllStudents(): void {
  try {
    const dir = path.join(DATA_DIR, 'students');
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const qqId = file.replace('.json', '');
      const userData = loadUserData(qqId);
      if (userData) {
        students.set(qqId, userData);
      }
    }
    console.log(`[Coach] 已加载 ${students.size} 个学生数据`);
  } catch (e) {
    console.error('[Coach] 加载学生数据失败:', e);
  }
}

// ==================== Plugin Export ====================
const coachAgentPlugin = {
  id: "coach-agent",
  name: "学习教练 Agent",
  description: "v3.0 用户中心版：答对/答错都给解析+统计",
  version: "3.0.0",
  
  register(api: OpenClawPluginApi) {
    console.log("[CoachAgent] v3.0 已加载");
    
    // 加载所有用户数据
    loadAllStudents();
    
    api.registerHook?.("message:qqbot", async (ctx: any) => {
      const { message, userId } = ctx;
      const response = await handleMessage(message.text || message, userId, api);
      return { ...ctx, response };
    });
  }
};

export default coachAgentPlugin;
export { handleMessage, getUserType, students, VALID_CODES, ADMIN_QQ_IDS, questionStates };
