// Achievement Badge Module - 成就徽章系统
// 学习成就激励，增加用户粘性

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = process.env.COACH_DATA_DIR || './data';

// 徽章定义
const BADGES = {
  first_practice: {
    id: 'first_practice',
    name: '🏃 初学者',
    description: '完成首次练习',
    condition: (userData) => (userData.stats?.total || 0) >= 1
  },
  streak_7: {
    id: 'streak_7',
    name: '📚 勤奋者',
    description: '连续打卡7天',
    condition: (userData) => (userData.streakDays || 0) >= 7
  },
  streak_30: {
    id: 'streak_30',
    name: '🔥 坚持者',
    description: '连续打卡30天',
    condition: (userData) => (userData.streakDays || 0) >= 30
  },
  exam_pass: {
    id: 'exam_pass',
    name: '🎯 突破者',
    description: '首次模拟考试及格（≥60分）',
    condition: (userData) => {
      const exams = userData.examHistory || [];
      return exams.some(e => e.score >= 60);
    }
  },
  exam_excellent: {
    id: 'exam_excellent',
    name: '🏆 学霸',
    description: '模拟考试90分以上',
    condition: (userData) => {
      const exams = userData.examHistory || [];
      return exams.some(e => e.score >= 90);
    }
  },
  wrong_killer_10: {
    id: 'wrong_killer_10',
    name: '🗡️ 消灭者',
    description: '消灭10道错题',
    condition: (userData) => {
      const eliminated = userData.eliminatedWrongQuestions || [];
      return eliminated.length >= 10;
    }
  },
  wrong_killer_50: {
    id: 'wrong_killer_50',
    name: '⚔️ 错题终结者',
    description: '消灭50道错题',
    condition: (userData) => {
      const eliminated = userData.eliminatedWrongQuestions || [];
      return eliminated.length >= 50;
    }
  },
  assessment_complete: {
    id: 'assessment_complete',
    name: '📋 测评达人',
    description: '完成入学测评',
    condition: (userData) => userData.assessmentCompleted === true
  },
  practice_100: {
    id: 'practice_100',
    name: '💯 百题斩',
    description: '累计练习100题',
    condition: (userData) => (userData.stats?.total || 0) >= 100
  },
  practice_500: {
    id: 'practice_500',
    name: '📖 千题王',
    description: '累计练习500题',
    condition: (userData) => (userData.stats?.total || 0) >= 500
  }
};

// 加载用户数据
function loadUserData(userId) {
  try {
    const filePath = path.join(DATA_DIR, 'students', `${userId}.json`);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error('[Achievement] 加载用户数据失败:', e);
  }
  return null;
}

// 保存用户数据
function saveUserData(userId, data) {
  try {
    const dir = path.join(DATA_DIR, 'students');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(DATA_DIR, 'students', `${userId}.json`),
      JSON.stringify(data, null, 2)
    );
  } catch (e) {
    console.error('[Achievement] 保存用户数据失败:', e);
  }
}

// 检查并解锁徽章
export function checkAchievements(userData) {
  const unlocked = userData.achievements || [];
  const unlockedIds = new Set(unlocked.map(a => a.id));
  const newlyUnlocked = [];
  
  for (const [key, badge] of Object.entries(BADGES)) {
    if (!unlockedIds.has(badge.id) && badge.condition(userData)) {
      const achievement = {
        id: badge.id,
        name: badge.name,
        description: badge.description,
        unlockedAt: new Date().toISOString()
      };
      unlocked.push(achievement);
      newlyUnlocked.push(achievement);
    }
  }
  
  if (newlyUnlocked.length > 0) {
    userData.achievements = unlocked;
    saveUserData(userData.userId, userData);
  }
  
  return newlyUnlocked;
}

// 格式化徽章消息
export function formatAchievementMessage(achievements) {
  if (achievements.length === 0) return null;
  
  let message = '🎉 恭喜获得新成就！\n\n';
  
  achievements.forEach(a => {
    message += `${a.name}\n`;
    message += `✨ ${a.description}\n\n`;
  });
  
  message += '发送 /徽章 查看所有成就';
  
  return message;
}

// ========== 命令处理 ==========

export async function achievementCommand(command, userId) {
  const trimmed = command.trim();
  const userData = loadUserData(userId);
  
  if (!userData) {
    return { result: '❌ 用户不存在，请先开始学习。' };
  }
  
  // 检查新成就
  const newlyUnlocked = checkAchievements(userData);
  
  // /徽章 或 /achievements - 查看所有徽章
  if (trimmed === '/徽章' || trimmed === '/achievements' || trimmed === '/成就') {
    const allAchievements = userData.achievements || [];
    const unlockedIds = new Set(allAchievements.map(a => a.id));
    
    let response = '🏆 成就徽章墙\n';
    response += '═'.repeat(30) + '\n\n';
    
    response += `📊 已获得: ${allAchievements.length}/${Object.keys(BADGES).length}\n\n`;
    
    // 已获得的徽章
    if (allAchievements.length > 0) {
      response += '✅ 已解锁:\n';
      allAchievements.forEach(a => {
        response += `  ${a.name}\n`;
      });
      response += '\n';
    }
    
    // 未获得的徽章
    const locked = Object.values(BADGES).filter(b => !unlockedIds.has(b.id));
    if (locked.length > 0) {
      response += '🔒 待解锁:\n';
      locked.slice(0, 5).forEach(b => {
        response += `  ${b.name} - ${b.description}\n`;
      });
      if (locked.length > 5) {
        response += `  ...还有${locked.length - 5}个成就等你解锁\n`;
      }
    }
    
    return { result: response };
  }
  
  // 如果有新解锁的徽章，显示祝贺
  if (newlyUnlocked.length > 0) {
    return { result: formatAchievementMessage(newlyUnlocked) };
  }
  
  return { result: '发送 /徽章 查看成就墙' };
}

// 在练习、考试等操作后调用，检查新成就
export async function checkAndNotifyAchievements(userId) {
  const userData = loadUserData(userId);
  if (!userData) return null;
  
  const newlyUnlocked = checkAchievements(userData);
  return formatAchievementMessage(newlyUnlocked);
}

export default achievementCommand;
