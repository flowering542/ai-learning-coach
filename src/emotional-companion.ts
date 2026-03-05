// 情感陪伴系统 - 成就徽章、学习打卡、考前提醒
import type { Student } from "./storage.js";

// 成就徽章定义
export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  condition: (stats: UserStats) => boolean;
}

export interface UserStats {
  totalQuestions: number;
  correctAnswers: number;
  streakDays: number;
  wrongCount: number;
  studyDays: number;
}

// 徽章列表
export const BADGES: Badge[] = [
  {
    id: "first_correct",
    name: "初出茅庐",
    emoji: "🎯",
    description: "首次答对题目",
    condition: (s) => s.correctAnswers >= 1,
  },
  {
    id: "streak_3",
    name: "坚持不懈",
    emoji: "🔥",
    description: "连续学习3天",
    condition: (s) => s.streakDays >= 3,
  },
  {
    id: "streak_7",
    name: "学习达人",
    emoji: "🌟",
    description: "连续学习7天",
    condition: (s) => s.streakDays >= 7,
  },
  {
    id: "streak_30",
    name: "习惯养成",
    emoji: "🏆",
    description: "连续学习30天",
    condition: (s) => s.streakDays >= 30,
  },
  {
    id: "accuracy_80",
    name: "准确率之星",
    emoji: "⭐",
    description: "正确率达到80%",
    condition: (s) => s.totalQuestions >= 10 && (s.correctAnswers / s.totalQuestions) >= 0.8,
  },
  {
    id: "accuracy_90",
    name: "学霸",
    emoji: "🎓",
    description: "正确率达到90%",
    condition: (s) => s.totalQuestions >= 20 && (s.correctAnswers / s.totalQuestions) >= 0.9,
  },
  {
    id: "questions_50",
    name: "刷题能手",
    emoji: "📚",
    description: "累计答题50道",
    condition: (s) => s.totalQuestions >= 50,
  },
  {
    id: "questions_100",
    name: "百题斩",
    emoji: "💯",
    description: "累计答题100道",
    condition: (s) => s.totalQuestions >= 100,
  },
  {
    id: "questions_500",
    name: "题海战士",
    emoji: "🌊",
    description: "累计答题500道",
    condition: (s) => s.totalQuestions >= 500,
  },
];

/**
 * 检查用户获得的徽章
 */
export function checkBadges(stats: UserStats): Badge[] {
  return BADGES.filter(badge => badge.condition(stats));
}

/**
 * 格式化徽章展示
 */
export function formatBadges(badges: Badge[]): string {
  if (badges.length === 0) {
    return "🏅 还没有徽章，继续加油！\n";
  }

  let output = `🏅 已获得 ${badges.length} 个徽章：\n\n`;
  badges.forEach(badge => {
    output += `${badge.emoji} ${badge.name} - ${badge.description}\n`;
  });
  return output;
}

/**
 * 生成学习打卡消息
 */
export function generateCheckInMessage(student: Student): string {
  const streak = student.streakDays;
  
  const messages: Record<number, string> = {
    1: "🌱 第一天学习，好的开始！",
    3: "🔥 连续3天了，保持这个节奏！",
    7: "🌟 一周了！你正在养成好习惯！",
    14: "💪 两周坚持，太厉害了！",
    21: "🚀 21天习惯养成，你已经做到了！",
    30: "🏆 一个月！你是学习达人！",
    60: "👑 两个月！这种坚持令人敬佩！",
    90: "🎖️ 三个月！你已经超越了大多数人！",
    100: "🌟💯 百日打卡！传奇！",
  };

  const specialMessage = messages[streak];
  if (specialMessage) {
    return specialMessage;
  }

  return `🔥 连续${streak}天打卡，继续保持！`;
}

/**
 * 生成进度可视化
 */
export function generateProgressVisual(accuracy: number, streakDays: number): string {
  const filledBlocks = Math.round(accuracy / 10);
  const emptyBlocks = 10 - filledBlocks;
  const accuracyBar = "█".repeat(filledBlocks) + "░".repeat(emptyBlocks);
  
  const fireIntensity = Math.min(streakDays, 10);
  const fireEmoji = fireIntensity >= 7 ? "🔥🔥🔥" : fireIntensity >= 3 ? "🔥🔥" : "🔥";
  
  return `📊 学习状态

正确率：${accuracyBar} ${accuracy}%
连续打卡：${fireEmoji} ${streakDays}天`;
}

/**
 * 考前倒计时
 */
export function generateExamCountdown(examDate?: string): string {
  if (!examDate) {
    return "📅 请设置考试日期，发送：/设置考试 2026-06-15";
  }

  const exam = new Date(examDate);
  const today = new Date();
  const diffTime = exam.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return "📅 考试已结束，祝你取得好成绩！";
  }

  if (diffDays === 0) {
    return "🎯 今天就是考试日！加油，你准备好了！";
  }

  const urgency = diffDays <= 7 ? "⚠️" : diffDays <= 30 ? "📢" : "📅";
  const message = diffDays <= 7 
    ? "最后冲刺阶段，重点复习错题！" 
    : diffDays <= 30 
    ? "还有一个月，制定复习计划！"
    : "时间充裕，稳步前进！";

  return `${urgency} 距离考试还有 ${diffDays} 天\n💡 ${message}`;
}

/**
 * 生成每日学习建议
 */
export function generateDailyAdvice(stats: UserStats): string {
  const accuracy = stats.totalQuestions > 0 
    ? (stats.correctAnswers / stats.totalQuestions) * 100 
    : 0;

  if (accuracy < 60) {
    return "💡 建议：基础还需巩固，建议从简单题开始，理解概念后再做题。";
  } else if (accuracy < 80) {
    return "💡 建议：掌握不错，注意错题归因，针对性提升薄弱点。";
  } else {
    return "💡 建议：保持状态，可以尝试挑战难题，扩展知识面。";
  }
}
