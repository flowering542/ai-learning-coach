// Pre-exam Counseling Module - 考前疏导
// 考前焦虑陪伴，情感支持

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = process.env.COACH_DATA_DIR || './data';

// 焦虑关键词
const ANXIETY_KEYWORDS = [
  '紧张', '焦虑', '怕', '担心', '考不过', '不及格', '失败',
  '没把握', '没信心', '害怕', '压力大', '睡不着',
  '怎么办', '能过吗', '能考上吗', '来得及吗'
];

// 加载用户数据
function loadUserData(userId) {
  try {
    const filePath = path.join(DATA_DIR, 'students', `${userId}.json`);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error('[Counseling] 加载用户数据失败:', e);
  }
  return null;
}

// 检测焦虑情绪
export function detectAnxiety(message) {
  return ANXIETY_KEYWORDS.some(keyword => message.includes(keyword));
}

// 生成疏导内容
function generateCounseling(userData) {
  const stats = userData?.stats || { total: 0, correct: 0 };
  const accuracy = stats.total > 0 ? Math.round(stats.correct / stats.total * 100) : 0;
  const streakDays = userData?.streakDays || 0;
  const wrongCount = userData?.wrongQuestions?.length || 0;
  const assessment = userData?.assessment?.result;
  
  let counseling = '';
  
  // 开场安抚
  counseling += '🫂 感受到你的紧张了\n\n';
  counseling += '先深呼吸，听我说几句:\n\n';
  
  // 数据 reassurance
  if (stats.total > 0) {
    counseling += `📊 你其实已经准备得很充分了:\n`;
    counseling += `• 累计练习 ${stats.total} 题\n`;
    counseling += `• 整体正确率 ${accuracy}%\n`;
    
    if (streakDays > 0) {
      counseling += `• 连续打卡 ${streakDays} 天\n`;
    }
    counseling += '\n';
  }
  
  // 入学测评数据
  if (assessment?.score) {
    counseling += `🎯 入学测评分数: ${assessment.score}分\n`;
    if (assessment.score >= 60) {
      counseling += `• 已经超过及格线，保持状态就能过！\n`;
    } else {
      counseling += `• 虽然基础薄弱，但通过练习已经进步很多了\n`;
    }
    counseling += '\n';
  }
  
  // 普遍化
  counseling += `💡 你知道吗？\n`;
  counseling += `• 80%的考生考前都会紧张，这是正常的\n`;
  counseling += `• 适度紧张反而能让你更专注\n`;
  counseling += `• 考试只是检验学习成果，不是人生全部\n\n`;
  
  // 行动建议
  counseling += `🎯 现在可以做的:\n`;
  
  if (wrongCount > 0) {
    counseling += `1. 发送 /错题复习 消灭${wrongCount}道错题\n`;
  }
  
  if (stats.total < 100) {
    counseling += `2. 发送 /练习 再做几题保持手感\n`;
  } else {
    counseling += `2. 发送 /模拟考试 做套题增强信心\n`;
  }
  
  counseling += `3. 早点休息，明天精神饱满去考试\n\n`;
  
  // 鼓励结尾
  counseling += `💪 你已经努力了，结果不会差的！\n`;
  counseling += `相信自己，你可以的！\n\n`;
  
  counseling += `发送 /模拟考试 做最后一套题，或者早点休息 😊`;
  
  return counseling;
}

// 生成考前倒计时提醒
function generateCountdownReminder(daysLeft, userData) {
  const stats = userData?.stats || { total: 0 };
  
  let reminder = `⏰ 考试倒计时: ${daysLeft} 天\n\n`;
  
  if (daysLeft <= 3) {
    reminder += `🔥 最后冲刺阶段！\n\n`;
    reminder += `建议:\n`;
    reminder += `1. 每天1套 /模拟考试\n`;
    reminder += `2. 重点看 /错题列表\n`;
    reminder += `3. 调整作息，保证睡眠\n`;
  } else if (daysLeft <= 7) {
    reminder += `📚 考前一周，稳扎稳打\n\n`;
    reminder += `建议:\n`;
    reminder += `1. 每天 /练习 20题保持手感\n`;
    reminder += `2. 每2天1套 /模拟考试\n`;
    reminder += `3. 消灭所有错题\n`;
  } else {
    reminder += `✅ 还有时间，继续积累\n\n`;
    reminder += `建议:\n`;
    reminder += `1. 坚持 /今日任务\n`;
    reminder += `2. 薄弱维度专项练习\n`;
    reminder += `3. 定期 /模拟考试 检测水平\n`;
  }
  
  reminder += `\n你已经练习了 ${stats.total} 题，继续加油！💪`;
  
  return reminder;
}

// ========== 命令处理 ==========

export async function counselingCommand(command, userId) {
  const trimmed = command.trim();
  const userData = loadUserData(userId);
  
  if (!userData) {
    return { result: '❌ 用户不存在' };
  }
  
  // /考前疏导 命令
  if (trimmed === '/考前疏导' || trimmed === '/counseling') {
    return { result: generateCounseling(userData) };
  }
  
  // 检测焦虑关键词
  if (detectAnxiety(trimmed)) {
    return { result: generateCounseling(userData) };
  }
  
  // 倒计时提醒（假设考试日期为2026-04-15）
  if (trimmed === '/倒计时' || trimmed === '/countdown') {
    const examDate = new Date('2026-04-15');
    const today = new Date();
    const daysLeft = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
    
    return { result: generateCountdownReminder(daysLeft, userData) };
  }
  
  return null; // 不处理，让其他模块处理
}

export default counselingCommand;
