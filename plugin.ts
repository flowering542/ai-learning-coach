// Coach Agent Plugin for OpenClaw
// 学习教练 Agent - 支持单 Bot 多角色路由
// 优化版：用户说"继续"才出下一题

import type { OpenClawPluginApi, AgentDefinition } from "openclaw/plugin-sdk";

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

// 答题状态管理（新流程：等用户说"继续"才下一题）
interface QuestionState {
  currentQuestion: {
    id: string;
    content: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  } | null;
  waitingForContinue: boolean;
  lastAnswerCorrect: boolean | null;
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
  
  return `👋 管理员你好！\n\n可用命令：\n/模式 - 查看当前模式\n/生成激活码 - 创建激活码\n/学生列表 - 查看学生\n/统计 - 查看数据`;
}

// ==================== 学生模式（新流程） ====================
async function handleStudentMessage(message: string, qqId: string): Promise<string> {
  const trimmed = message.trim().toLowerCase();
  const student = students.get(qqId)!;
  student.lastActiveAt = new Date().toISOString();
  
  // 获取或初始化答题状态
  let state = questionStates.get(qqId);
  if (!state) {
    state = { currentQuestion: null, waitingForContinue: false, lastAnswerCorrect: null };
    questionStates.set(qqId, state);
  }
  
  // 如果正在等待用户说"继续"
  if (state.waitingForContinue) {
    if (trimmed === "继续" || trimmed === "下一题" || trimmed === "jt" || trimmed === "xyt") {
      state.waitingForContinue = false;
      return generateQuestion(qqId);
    }
    // 用户还在讨论，继续对话
    return handleDiscussion(message, qqId, state);
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
        return generateQuestion(qqId);
        
      case "查询":
      case "search":
        const args = message.slice(cmd.length + 2).trim();
        if (!args) return "请输入关键词，例如：/查询 血型";
        return `🔍 "${args}" 的搜索结果：\n\n1. 【输血】ABO血型鉴定\n2. 【输血】交叉配血试验\n3. 【检验】血常规检查\n\n回复数字查看详情。`;
        
      case "进度":
      case "progress":
        const acc = student.totalQuestions > 0 
          ? Math.round((student.correctAnswers / student.totalQuestions) * 100)
          : 0;
        return `📊 学习进度\n\n👤 ID: ${student.id.slice(-6)}\n📝 总题数: ${student.totalQuestions}\n✅ 正确率: ${acc}%\n🔥 连续打卡: 3天`;
        
      case "帮助":
      case "help":
        return `📖 学习教练\n\n/练习 - 开始练习题\n/查询 <关键词> - 搜索题目\n/进度 - 查看进度\n/帮助 - 显示帮助\n\n答题时回复 1/2/3/4`;
        
      default:
        return `未知命令：${cmd}\n\n发送 /帮助 查看可用命令。`;
    }
  }
  
  // 自然语言
  if (message.includes("你好")) return "你好！我是学习教练 📚\n\n试试：/练习 /查询 /进度";
  if (message.includes("谢谢")) return "不客气！继续加油 💪";
  if (message.includes("再见")) return "再见！明天继续练习 👋";
  
  return `收到！你可以：\n\n/练习 - 开始练习题\n/查询 ${message} - 搜索相关题目\n/帮助 - 查看所有命令`;
}

// 生成新题目
function generateQuestion(qqId: string): string {
  const state = questionStates.get(qqId)!;
  const question = questionBank[Math.floor(Math.random() * questionBank.length)];
  
  state.currentQuestion = question;
  state.waitingForContinue = false;
  state.lastAnswerCorrect = null;
  
  return `📝 ${question.content}\n\n${question.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}\n\n回复 1/2/3/4`;
}

// 处理答题
function handleAnswer(answer: string, qqId: string, state: QuestionState, student: Student): string {
  if (!state.currentQuestion) return "请先发送 /练习 开始答题";
  
  const isCorrect = answer === state.currentQuestion.correctAnswer;
  state.lastAnswerCorrect = isCorrect;
  state.waitingForContinue = true;
  
  // 更新统计
  student.totalQuestions++;
  if (isCorrect) student.correctAnswers++;
  
  if (isCorrect) {
    return `✅ 对了！为什么选这个？🤔\n\n（回复"继续"）`;
  } else {
    return `❌ 再想想。关键是什么？💡\n\n（回复"继续"）`;
  }
}

// 处理讨论（用户答完后继续对话）
function handleDiscussion(message: string, qqId: string, state: QuestionState): string {
  return `💡 收到！回复"继续"出下一题`;
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
    };
    students.set(qqId, student);
    
    return `🎉 激活成功！欢迎加入学习教练！\n\n可用命令：\n• /练习 - 开始练习题\n• /查询 <关键词> - 搜索题目\n• /进度 - 查看学习进度\n• /帮助 - 显示帮助\n\n开始你的学习之旅吧！📚`;
  }
  
  return `👋 欢迎使用学习教练！\n\n请输入激活码：\n\n示例：STUDENT2024A\n\n演示码：\n• COACH-DEMO-001\n• COACH-DEMO-002\n\n没有激活码？联系管理员获取。`;
}

// ==================== Plugin Export ====================
const coachAgentPlugin = {
  id: "coach-agent",
  name: "学习教练 Agent",
  description: "支持单 Bot 多角色的学习辅导系统（优化版：用户控制节奏）",
  version: "1.1.0",
  
  register(api: OpenClawPluginApi) {
    console.log("[CoachAgent] 学习教练 Agent 已加载");
    console.log(`[CoachAgent] 管理员: ${ADMIN_QQ_IDS.size} 人`);
    console.log(`[CoachAgent] 激活码: ${VALID_CODES.size} 个`);
    
    // 注册消息处理器
    api.registerHook?.("message:qqbot", async (ctx: any) => {
      const { message, userId } = ctx;
      const response = await handleMessage(message.text || message, userId, api);
      return { ...ctx, response };
    });
  }
};

export default coachAgentPlugin;
export { handleMessage, getUserType, students, VALID_CODES, ADMIN_QQ_IDS, questionStates };
