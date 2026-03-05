// OpenClaw Agent 扩展 - 学习教练
// 直接集成到 main Agent，无需插件

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
} from "../src/storage.js";
import {
  generateErrorReasonPrompt,
  parseErrorReason,
  getSuggestionByReason,
  generateWeakPointReport,
  formatWeakPointReport,
  type ErrorReason,
} from "../src/error-analysis.js";
import {
  checkBadges,
  formatBadges,
  generateCheckInMessage,
  generateProgressVisual,
  generateExamCountdown,
  generateDailyAdvice,
  type UserStats,
} from "../src/emotional-companion.js";

// 配置
const ADMIN_QQ_IDS = new Set<string>([
  ...(process.env.COACH_ADMIN_QQ_IDS?.split(",").filter(Boolean) || []),
]);

const VALID_CODES = new Set([
  "STUDENT2024A", "STUDENT2024B", "STUDENT2024C",
  "COACH-DEMO-001", "COACH-DEMO-002",
]);

// 初始化
initStorage();

// 处理学习教练命令
export async function handleCoachCommand(
  message: string,
  qqId: string
): Promise<string | null> {
  const trimmed = message.trim();
  
  // 检查用户类型
  const userType = getUserType(qqId);
  
  // 处理命令
  if (userType === 'admin') {
    return await handleAdminCommand(trimmed, qqId);
  } else if (userType === 'student') {
    return await handleStudentCommand(trimmed, qqId);
  } else {
    return await handleGuestCommand(trimmed, qqId);
  }
}

function getUserType(qqId: string): 'admin' | 'student' | 'guest' {
  if (ADMIN_QQ_IDS.has(qqId)) return 'admin';
  if (getStudentByQQ(qqId)) return 'student';
  return 'guest';
}

// 管理员命令
async function handleAdminCommand(message: string, qqId: string): Promise<string | null> {
  if (!message.startsWith('/') && !message.startsWith('、')) return null;
  
  const cmd = message.slice(1).split(' ')[0].toLowerCase();
  
  switch (cmd) {
    case '模式':
      return '🎯 当前模式：管理员\n\n可用命令：\n• /生成激活码\n• /学生列表\n• /统计\n• /切换';
    case '生成激活码':
    case 'gen':
      const code = `STU-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      VALID_CODES.add(code);
      return `✅ 新激活码：${code}\n\n将此码发给学生即可激活。`;
    case '学生列表':
      const students = getAllStudents();
      if (students.length === 0) return '📋 暂无已激活学生。';
      let list = '📋 学生列表\n\n';
      students.forEach((s, i) => {
        const acc = s.totalQuestions > 0 ? Math.round((s.correctAnswers / s.totalQuestions) * 100) : 0;
        list += `${i + 1}. ID:${s.id.slice(-6)} 正确率:${acc}% 🔥${s.streakDays}天\n`;
      });
      return list;
    case '统计':
      const stats = getGlobalStats();
      return `📊 统计\n\n👥 学生: ${stats.totalStudents}\n📝 答题: ${stats.totalAnswers}\n✅ 平均正确率: ${stats.avgAccuracy}%`;
    case '切换':
      ADMIN_QQ_IDS.delete(qqId);
      return '✅ 已切换到学生模式，发送 /恢复 可恢复管理员身份。';
    default:
      return null;
  }
}

// 学生命令
async function handleStudentCommand(message: string, qqId: string): Promise<string | null> {
  const student = getStudentByQQ(qqId);
  if (!student) return null;
  
  student.lastActiveAt = new Date().toISOString();
  
  // 更新连续学习天数
  const today = new Date().toISOString().split('T')[0];
  if (student.lastStudyDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (student.lastStudyDate === yesterday.toISOString().split('T')[0]) {
      student.streakDays += 1;
    } else {
      student.streakDays = 1;
    }
    student.lastStudyDate = today;
    updateStudent(student);
  }
  
  if (!message.startsWith('/') && !message.startsWith('、')) return null;
  
  const cmd = message.slice(1).split(' ')[0].toLowerCase();
  
  switch (cmd) {
    case '练习':
    case 'lx':
      return '📝 练习模式\n\n【题目示例】\nABO血型系统中，A型血的抗原是？\n\nA. A抗原\nB. B抗原\nC. AB抗原\nD. 无抗原\n\n回复 A/B/C/D 选择答案';
    case '错题':
    case 'ct':
      const wrongs = getStudentWrongAnswers(student.id);
      if (wrongs.length === 0) return '🎉 还没有错题，继续保持！';
      return `🔄 错题复习\n\n你有 ${wrongs.length} 道错题\n发送 /练习 开始针对性练习`;
    case '进度':
    case 'progress':
      const acc = student.totalQuestions > 0 ? Math.round((student.correctAnswers / student.totalQuestions) * 100) : 0;
      return `📊 学习进度\n\n📝 总题数: ${student.totalQuestions}\n✅ 正确率: ${acc}%\n🔥 连续打卡: ${student.streakDays}天`;
    case '分析':
    case 'fx':
      const report = generateWeakPointReport(student.id);
      return formatWeakPointReport(report);
    case '徽章':
    case 'badge':
      const badges = checkBadges({
        totalQuestions: student.totalQuestions,
        correctAnswers: student.correctAnswers,
        streakDays: student.streakDays,
        wrongCount: getStudentWrongAnswers(student.id).length,
        studyDays: student.streakDays,
      });
      return formatBadges(badges);
    case '打卡':
    case 'checkin':
      return generateCheckInMessage(student);
    case '恢复':
      if (process.env.COACH_ADMIN_QQ_IDS?.includes(qqId)) {
        ADMIN_QQ_IDS.add(qqId);
        return '✅ 已恢复管理员身份。';
      }
      return null;
    default:
      return null;
  }
}

// 访客命令
async function handleGuestCommand(message: string, qqId: string): Promise<string | null> {
  // 尝试激活
  if (VALID_CODES.has(message.trim())) {
    const existing = getStudentByQQ(qqId);
    if (existing) return '❌ 你已经激活过了，直接发送 /练习 开始学习。';
    
    const allStudents = getAllStudents();
    const codeUsed = allStudents.find(s => s.activationCode === message.trim());
    if (codeUsed) return '❌ 该激活码已被使用，请联系管理员获取新码。';
    
    const student: Student = {
      id: `stu_${Date.now()}`,
      qqId,
      activatedAt: new Date().toISOString(),
      activationCode: message.trim(),
      totalQuestions: 0,
      correctAnswers: 0,
      lastActiveAt: new Date().toISOString(),
      streakDays: 0,
    };
    
    createStudent(student);
    return '🎉 激活成功！欢迎加入学习教练！\n\n可用命令：\n• /练习 - 开始练习题\n• /进度 - 查看学习进度\n• /帮助 - 显示帮助';
  }
  
  return '👋 欢迎使用学习教练！\n\n请输入激活码：\n• COACH-DEMO-001\n• COACH-DEMO-002\n\n没有激活码？联系管理员获取。';
}

console.log('[CoachAgent] 学习教练 Agent 扩展已加载');
console.log(`[CoachAgent] 管理员: ${ADMIN_QQ_IDS.size} 人`);
