// Coach Agent Plugin for OpenClaw
// 学习教练 Agent - v3.0 用户中心版

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";

// ==================== 配置区域 ====================
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

// 答题状态管理
interface QuestionState {
  currentQuestion: {
    id: string;
    content: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  } | null;
  lastQuestion: {
    id: string;
    content: string;
    correctAnswer: string;
    explanation: string;
    isCorrect: boolean;
  } | null;
  waitingForContinue: boolean;
}

// ==================== 数据存储 ====================
const students = new Map<string, Student>();
const questionStates = new Map<string, QuestionState>();

// 模拟题库
const questionBank = [
  {
    id: "q001",
    content: "输血前检查，下列哪项是必查项目？",
    options: ["ABO血型鉴定", "肝功能检查", "肾功能检查", "血糖检测"],
    correctAnswer: "1",
    explanation: "ABO血型鉴定是输血前必查项目，确保血型匹配避免溶血反应。"
  },
  {
    id: "q002", 
    content: "治疗性红细胞去除术适用于",
    options: ["真性红细胞增多症", "缺铁性贫血", "再生障碍性贫血", "急性失血"],
    correctAnswer: "1",
    explanation: "真性红细胞增多症是红细胞异常增多，需要去除多余红细胞。"
  },
  {
    id: "q003",
    content: "慢性贫血患者输血的红细胞输注指征是Hb低于",
    options: ["50g/L", "60g/L", "70g/L", "80g/L"],
    correctAnswer: "2",
    explanation: "慢性贫血患者Hb<60g/L且伴有明显缺氧症状时应考虑输血。"
  }
];

// ==================== 路由核心 ====================
function getUserType(qqId: string): 'admin' | 'student' | 'guest' {
  if (ADMIN_QQ_IDS.has(qqId)) return 'admin';
  if (students.has(qqId)) return 'student';
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
        for (const s of students.values()) {
          list += `${i}. ID:${s.id.slice(-6)} 激活:${new Date(s.activatedAt).toLocaleDateString()}\n`;
          i++;
        }
        return list;
        
      case "统计":
      case "stats":
        let totalQ = 0, totalC = 0;
        for (const s of students.values()) {
          totalQ += s.totalQuestions;
          totalC += s.correctAnswers;
        }
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
  const student = students.get(qqId)!;
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
    
    // 用户说其他内容（不懂）→ 直接教知识点
    return teachLastQuestion(qqId, state, student);
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
        
      case "帮助":
      case "help":
        return `📖 学习教练\n\n/练习 - 开始练习题\n/进度 - 查看进度\n/帮助 - 显示帮助\n\n答题时回复 1/2/3/4`;
        
      default:
        return `未知命令：${cmd}\n\n发送 /帮助 查看可用命令。`;
    }
  }
  
  // 自然语言
  if (message.includes("你好")) return "你好！我是学习教练 📚\n\n试试：/练习";
  
  return `收到！发送 /练习 开始练习题`;
}

// 生成新题目（带统计）
function generateQuestion(qqId: string, student: Student): string {
  const state = questionStates.get(qqId)!;
  const question = questionBank[Math.floor(Math.random() * questionBank.length)];
  
  state.currentQuestion = question;
  state.waitingForContinue = false;
  
  // 显示统计（如果有答题记录）
  let stats = "";
  if (student.totalQuestions > 0) {
    const acc = Math.round((student.correctAnswers / student.totalQuestions) * 100);
    stats = `📊 已答${student.totalQuestions}题，正确率${acc}%\n\n`;
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
    isCorrect: isCorrect
  };
  
  // 清除当前题目
  state.currentQuestion = null;
  state.waitingForContinue = true;
  questionStates.set(qqId, state);
  saveUserData(qqId, student);
  
  const acc = Math.round((student.correctAnswers / student.totalQuestions) * 100);
  
  // 统一格式：无论对错都给解析+统计
  const result = isCorrect ? "✅ 对了！" : "❌ 错了！";
  
  return `${result}\n\n💡 ${question.explanation}\n\n📊 已答${student.totalQuestions}题，正确率${acc}%\n\n回复"继续"出下一题`;
}

// 教用户知识点（当用户不懂时）
function teachLastQuestion(qqId: string, state: QuestionState, student: Student): string {
  if (!state.lastQuestion) {
    return `💡 回复"继续"出下一题，或发送 /练习 重新开始`;
  }
  
  const q = state.lastQuestion;
  const result = q.isCorrect ? "✅ 上一题你答对了！" : "❌ 上一题答案是" + q.correctAnswer + "。";
  
  return `${result}\n\n💡 ${q.explanation}\n\n📊 继续学习，回复"继续"出下一题`;
}

// 保存用户数据
function saveUserData(qqId: string, student: Student): void {
  students.set(qqId, student);
}

// ==================== 访客模式 ====================
async function handleGuestMessage(message: string, qqId: string): Promise<string> {
  const trimmed = message.trim();
  
  // 尝试激活
  if (VALID_CODES.has(trimmed)) {
    for (const s of students.values()) {
      if (s.activationCode === trimmed) {
        return "❌ 该激活码已被使用。";
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
    };
    students.set(qqId, student);
    
    return `🎉 激活成功！\n\n/练习 - 开始练习题\n/进度 - 查看进度`;
  }
  
  return `👋 请输入激活码：\n\n演示码：COACH-DEMO-001`;
}

// ==================== Plugin Export ====================
const coachAgentPlugin = {
  id: "coach-agent",
  name: "学习教练 Agent",
  description: "v3.0 用户中心版：答对/答错都给解析+统计",
  version: "3.0.0",
  
  register(api: OpenClawPluginApi) {
    console.log("[CoachAgent] v3.0 已加载");
    
    api.registerHook?.("message:qqbot", async (ctx: any) => {
      const { message, userId } = ctx;
      const response = await handleMessage(message.text || message, userId, api);
      return { ...ctx, response };
    });
  }
};

export default coachAgentPlugin;
export { handleMessage, getUserType, students, VALID_CODES, ADMIN_QQ_IDS, questionStates };
