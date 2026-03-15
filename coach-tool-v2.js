// Coach Tool V2 - 集成1000题新题库
// 支持4维度分类、5选项、新数据结构

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = process.env.COACH_DATA_DIR || './data';
const DIMENSIONS = ['基础知识', '相关专业知识', '专业知识', '专业实践'];

// ========== 数据加载 ==========

// 加载用户数据
function loadUserData(userId) {
  try {
    const filePath = path.join(DATA_DIR, 'students', `${userId}.json`);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error('[CoachV2] 加载用户数据失败:', e);
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
    console.error('[CoachV2] 保存用户数据失败:', e);
  }
}

// 加载新题库 (V2)
function loadQuestionBankV2() {
  try {
    const dataPath = path.join(DATA_DIR, 'questions-v2-final.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    return data;
  } catch (e) {
    console.error('[CoachV2] 新题库加载失败:', e);
    // 降级到旧题库
    return loadQuestionBankV1();
  }
}

// 加载旧题库 (V1兼容)
function loadQuestionBankV1() {
  try {
    const dataPath = path.join(DATA_DIR, 'questions.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    return { 
      metadata: { version: '1.0', totalQuestions: data.questions?.length || 0 },
      questions: data.questions || []
    };
  } catch (e) {
    console.error('[CoachV2] 旧题库加载失败:', e);
    return { metadata: { version: '0.0', totalQuestions: 0 }, questions: [] };
  }
}

// ========== 题目筛选 ==========

// 按维度获取题目
function getQuestionsByDimension(bank, dimension, count = 10) {
  const filtered = bank.questions.filter(q => q.dimension === dimension);
  return shuffleArray(filtered).slice(0, count);
}

// 随机打乱数组
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ========== 答题逻辑 ==========

// 检查答案
function checkAnswer(question, userAnswer) {
  const correctOption = question.options.find(o => o.isCorrect);
  return {
    isCorrect: correctOption?.id === userAnswer,
    correctAnswer: correctOption?.id,
    explanation: question.explanation
  };
}

// 分析错误原因
function analyzeErrorReason(question, userAnswer) {
  const options = ['A', 'B', 'C', 'D', 'E'];
  const userIdx = options.indexOf(userAnswer);
  const correctIdx = options.indexOf(question.options.find(o => o.isCorrect)?.id);
  
  if (Math.abs(userIdx - correctIdx) === 1) {
    return '粗心大意';
  }
  
  if (question.dimension?.includes('专业')) {
    return '概念混淆';
  }
  
  return '知识盲区';
}

// ========== 主函数 ==========

export async function coachToolV2(command, userId, platform, adminIds) {
  if (!command || command.trim() === '') {
    return { 
      result: '👋 欢迎使用AI学习教练 V2！\n\n发送 /帮助 查看可用命令。' 
    };
  }
  
  const trimmed = command.trim();
  const userData = loadUserData(userId) || { 
    userId, 
    activated: false,
    stats: { total: 0, correct: 0, wrong: 0 },
    wrongQuestions: [],
    currentDimension: null
  };
  const isAdmin = adminIds?.includes(userId);
  const bank = loadQuestionBankV2();
  
  // ========== 帮助命令 ==========
  if (trimmed === '/帮助' || trimmed === '/help') {
    return {
      result: `📚 AI学习教练 V2 命令指南

【练习模式】
/练习 - 随机练习（混合维度）
/基础知识 - 基础知识专项
/相关专业知识 - 相关专业知识专项
/专业知识 - 专业知识专项
/专业实践 - 专业实践专项

【功能】
/进度 - 查看学习进度
/错题 - 查看错题本
/分析 - 能力分析

【答题】
直接回复 A/B/C/D/E 作答
回复"下一题"或"继续"获取新题`
    };
  }
  
  // ========== 维度练习 ==========
  if (DIMENSIONS.includes(trimmed.replace('/', ''))) {
    const dimension = trimmed.replace('/', '');
    userData.currentDimension = dimension;
    userData.currentMode = 'practice';
    userData.currentQuestions = getQuestionsByDimension(bank, dimension, 20);
    userData.currentIndex = 0;
    saveUserData(userId, userData);
    
    return formatQuestion(userData.currentQuestions[0], 1, 20);
  }
  
  // ========== 随机练习 ==========
  if (trimmed === '/练习' || trimmed === '/practice') {
    userData.currentDimension = 'mixed';
    userData.currentMode = 'practice';
    userData.currentQuestions = shuffleArray(bank.questions).slice(0, 20);
    userData.currentIndex = 0;
    saveUserData(userId, userData);
    
    return formatQuestion(userData.currentQuestions[0], 1, 20);
  }
  
  // ========== 答题处理 ==========
  if (/^[A-Ea-e]$/.test(trimmed) && userData.currentMode === 'practice') {
    const currentQ = userData.currentQuestions?.[userData.currentIndex];
    if (!currentQ) {
      return { result: '❌ 当前没有进行中的练习，发送 /练习 开始。' };
    }
    
    const answer = trimmed.toUpperCase();
    const result = checkAnswer(currentQ, answer);
    
    // 更新统计
    userData.stats.total++;
    if (result.isCorrect) {
      userData.stats.correct++;
    } else {
      userData.stats.wrong++;
      userData.wrongQuestions.push({
        questionId: currentQ.id,
        dimension: currentQ.dimension,
        userAnswer: answer,
        correctAnswer: result.correctAnswer,
        timestamp: new Date().toISOString()
      });
    }
    
    saveUserData(userId, userData);
    
    // 返回结果 - 人性化反馈
    let response = '';
    
    if (result.isCorrect) {
      response += '✅ 回答正确！\n';
      response += '━━━━━━━━━━━━━━━━━━━━\n\n';
      response += '能简单说说为什么选这个吗？🤔\n\n';
    } else {
      response += '❌ 错了，别灰心！\n';
      response += '━━━━━━━━━━━━━━━━━━━━\n\n';
      response += '📖 先理解这个知识点：\n';
    }
    
    response += `${result.explanation || '暂无解析'}\n\n`;
    
    if (!result.isCorrect) {
      response += `✅ 正确答案：${result.correctAnswer}\n`;
      response += `📚 知识点：${currentQ.dimension || '输血检验'}\n\n`;
      response += '🤔 你当时是怎么想的？\n';
      response += '（回复你的想法，或直接发送"继续"下一题）\n';
    }
    
    // 计算正确率
    const total = userData.stats.total;
    const correct = userData.stats.correct;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    
    // 考前疏导话术（根据状态）
    const encouragements = [];
    
    // 连续做题疲劳检测（>10题）
    if (total % 10 === 0 && total >= 10) {
      encouragements.push(`💪 已经做了${total}题了，休息一下吧！大脑需要充电~`);
    }
    
    // 正确率下降鼓励
    if (accuracy < 50 && total >= 5) {
      encouragements.push('🌟 刚开始正确率低很正常，80%的人都在这里卡过，坚持就会进步！');
    }
    
    // 进步鼓励（比上次高）
    if (accuracy >= 60 && total >= 10) {
      encouragements.push(`🎯 正确率${accuracy}%，比刚开始进步多了！继续保持这个节奏~`);
    }
    
    // 连续打卡鼓励
    if (userData.streakDays >= 3) {
      encouragements.push(`🔥 连续${userData.streakDays}天学习，你已经超过大多数人了！`);
    }
    
    // 随机鼓励（20%概率）
    if (Math.random() < 0.2) {
      const randomEncouragement = [
        '💡 记住：考试不是目的，掌握知识才是。你正在变得更专业！',
        '🌱 每一道题都是进步，不管对错，你都在成长。',
        '⭐ 备考就像马拉松，不是短跑。你的坚持终将得到回报！',
        '🎯 专注当下，不要想结果。做好每一道题，考试自然没问题。'
      ];
      encouragements.push(randomEncouragement[Math.floor(Math.random() * randomEncouragement.length)]);
    }
    
    // 添加一条鼓励（最多一条，避免信息过载）
    if (encouragements.length > 0) {
      response += '\n' + encouragements[0] + '\n';
    }
    
    response += '\n📊 学习统计\n';
    response += '────────────────────\n';
    response += `📋 总题数：${total}\n`;
    response += `🎯 正确率：${accuracy}%\n`;
    response += `🔥 连续打卡：${userData.streakDays || 1}天\n\n`;
    
    if (!result.isCorrect) {
      response += '📝 错题已记录\n\n';
    }
    
    response += '（想明白后回复"继续"出下一题）';
    
    return { result: response };
  }
  
  // ========== 继续下一题 ==========
  if (trimmed === '继续' || trimmed === '下一题' || trimmed === 'next') {
    if (userData.currentMode !== 'practice') {
      return { result: '❌ 没有进行中的练习，发送 /练习 开始。' };
    }
    
    userData.currentIndex++;
    if (userData.currentIndex >= userData.currentQuestions?.length) {
      return { 
        result: `🎉 练习完成！\n\n本次练习${userData.currentQuestions.length}题已全部完成。\n发送 /练习 开始新一轮。` 
      };
    }
    
    saveUserData(userId, userData);
    return formatQuestion(
      userData.currentQuestions[userData.currentIndex],
      userData.currentIndex + 1,
      userData.currentQuestions.length
    );
  }
  
  // ========== 查看进度 ==========
  if (trimmed === '/进度' || trimmed === '/stats') {
    const stats = userData.stats || { total: 0, correct: 0, wrong: 0 };
    const accuracy = stats.total > 0 ? (stats.correct / stats.total * 100).toFixed(1) : 0;
    
    return {
      result: `📊 学习进度

总答题数：${stats.total}
正确：${stats.correct}
错误：${stats.wrong}
正确率：${accuracy}%

错题本：${userData.wrongQuestions?.length || 0} 题

发送 /错题 查看错题本。`
    };
  }
  
  // ========== 查看错题 ==========
  if (trimmed === '/错题' || trimmed === '/wrong') {
    const wrongCount = userData.wrongQuestions?.length || 0;
    if (wrongCount === 0) {
      return { result: '🎉 还没有错题，继续保持！' };
    }
    
    // 按维度统计
    const byDimension = {};
    userData.wrongQuestions.forEach(w => {
      byDimension[w.dimension] = (byDimension[w.dimension] || 0) + 1;
    });
    
    let response = `📋 错题本 (${wrongCount}题)\n\n`;
    response += '按维度分布：\n';
    Object.entries(byDimension).forEach(([dim, count]) => {
      response += `  ${dim}: ${count}题\n`;
    });
    
    return { result: response };
  }
  
  // 默认响应
  return { 
    result: '👋 欢迎使用AI学习教练 V2！\n\n发送 /帮助 查看可用命令，或发送 /练习 开始做题。' 
  };
}

// ========== 格式化题目 ==========

function formatQuestion(question, index, total) {
  let text = `【第 ${index}/${total} 题】${question.dimension || '综合'}\n\n`;
  text += `${question.content}\n\n`;
  
  question.options?.forEach(opt => {
    text += `${opt.id}. ${opt.text}\n`;
  });
  
  text += '\n请回复 A/B/C/D/E 作答。';
  
  return { result: text };
}

export default coachToolV2;
