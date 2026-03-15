// Entrance Assessment Module - 入学测评
// 评估基础水平，生成个性化学习建议

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = process.env.COACH_DATA_DIR || './data';
const ASSESSMENT_QUESTIONS = 20; // 20题
const ASSESSMENT_DURATION = 30 * 60 * 1000; // 30分钟

// 加载用户数据
function loadUserData(userId) {
  try {
    const filePath = path.join(DATA_DIR, 'students', `${userId}.json`);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error('[Assessment] 加载用户数据失败:', e);
  }
  return { userId, stats: {}, wrongQuestions: [] };
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
    console.error('[Assessment] 保存用户数据失败:', e);
  }
}

// 加载题库
function loadQuestionBank() {
  try {
    const dataPath = path.join(DATA_DIR, 'questions-v2-final.json');
    return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } catch (e) {
    console.error('[Assessment] 题库加载失败:', e);
    return { questions: [] };
  }
}

// 生成测评试卷（20题，4维度各5题）
function generateAssessmentPaper(bank) {
  const dimensions = ['基础知识', '相关专业知识', '专业知识', '专业实践'];
  const paper = [];
  
  for (const dim of dimensions) {
    const dimQuestions = bank.questions.filter(q => q.dimension === dim);
    const selected = shuffleArray(dimQuestions).slice(0, 5);
    paper.push(...selected);
  }
  
  return shuffleArray(paper);
}

// 随机打乱
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 评估等级
function getAssessmentLevel(score) {
  if (score >= 80) return { level: '优秀', description: '基础扎实', recommendation: '建议直接进入冲刺阶段，重点突破难点' };
  if (score >= 60) return { level: '良好', description: '基础一般', recommendation: '建议系统学习，巩固基础知识' };
  return { level: '薄弱', description: '基础薄弱', recommendation: '建议从基础知识开始，循序渐进' };
}

// ========== 主函数 ==========

export async function assessmentCommand(command, userId) {
  const trimmed = command.trim();
  const userData = loadUserData(userId);
  const bank = loadQuestionBank();
  
  // 开始入学测评
  if (trimmed === '/入学测评' || trimmed === '/assessment') {
    // 检查是否已完成测评
    if (userData.assessment?.completed) {
      return showAssessmentResult(userData);
    }
    
    // 检查是否有进行中的测评
    if (userData.assessment?.status === 'in_progress') {
      const timeLeft = userData.assessment.endTime - Date.now();
      if (timeLeft > 0) {
        const currentQ = userData.assessment.questions[userData.assessment.currentIndex];
        return formatAssessmentQuestion(currentQ, userData.assessment.currentIndex + 1, ASSESSMENT_QUESTIONS, timeLeft);
      }
    }
    
    // 生成新测评
    const paper = generateAssessmentPaper(bank);
    if (paper.length < ASSESSMENT_QUESTIONS) {
      return { result: '❌ 题库题目不足，无法生成测评。' };
    }
    
    userData.assessment = {
      status: 'in_progress',
      startTime: Date.now(),
      endTime: Date.now() + ASSESSMENT_DURATION,
      questions: paper,
      currentIndex: 0,
      answers: {},
      createdAt: new Date().toISOString()
    };
    
    saveUserData(userId, userData);
    
    return {
      result: `📝 入学测评开始！\n\n` +
              `⏱️ 测评时间: 30分钟\n` +
              `📋 题目数量: 20题\n` +
              `📊 题目分布: 基础知识5 + 相关专业知识5 + 专业知识5 + 专业实践5\n\n` +
              `测评目的:\n` +
              `• 评估你的基础水平\n` +
              `• 生成个性化学习建议\n` +
              `• 制定专属学习计划\n\n` +
              `发送 /开始测评 或任意键开始答题！`
    };
  }
  
  // 开始答题
  if (trimmed === '/开始测评' || trimmed === '/start') {
    if (!userData.assessment || userData.assessment.status !== 'in_progress') {
      return { result: '❌ 没有进行中的测评，发送 /入学测评 开始。' };
    }
    
    const timeLeft = userData.assessment.endTime - Date.now();
    if (timeLeft <= 0) {
      return submitAssessment(userId, userData);
    }
    
    const currentQ = userData.assessment.questions[userData.assessment.currentIndex];
    return formatAssessmentQuestion(currentQ, 1, ASSESSMENT_QUESTIONS, timeLeft);
  }
  
  // 检查是否有进行中的测评
  if (!userData.assessment || userData.assessment.status !== 'in_progress') {
    return { result: '❌ 没有进行中的测评，发送 /入学测评 开始新测评。' };
  }
  
  const timeLeft = userData.assessment.endTime - Date.now();
  
  // 检查时间是否结束
  if (timeLeft <= 0) {
    return submitAssessment(userId, userData);
  }
  
  // 答题
  if (/^[A-Ea-e]$/.test(trimmed)) {
    const answer = trimmed.toUpperCase();
    const currentQ = userData.assessment.questions[userData.assessment.currentIndex];
    
    userData.assessment.answers[currentQ.id] = {
      questionId: currentQ.id,
      userAnswer: answer,
      dimension: currentQ.dimension,
      timestamp: Date.now()
    };
    
    userData.assessment.currentIndex++;
    saveUserData(userId, userData);
    
    // 检查是否答完
    if (userData.assessment.currentIndex >= ASSESSMENT_QUESTIONS) {
      return submitAssessment(userId, userData);
    }
    
    // 下一题
    const nextQ = userData.assessment.questions[userData.assessment.currentIndex];
    return formatAssessmentQuestion(nextQ, userData.assessment.currentIndex + 1, ASSESSMENT_QUESTIONS, timeLeft);
  }
  
  // 显示当前题目
  const currentQ = userData.assessment.questions[userData.assessment.currentIndex];
  return formatAssessmentQuestion(currentQ, userData.assessment.currentIndex + 1, ASSESSMENT_QUESTIONS, timeLeft);
}

// 提交测评
function submitAssessment(userId, userData) {
  userData.assessment.status = 'completed';
  userData.assessment.submitTime = Date.now();
  
  let correct = 0;
  const byDimension = {};
  
  for (const q of userData.assessment.questions) {
    const answer = userData.assessment.answers[q.id];
    const correctOption = q.options.find(o => o.isCorrect);
    const isCorrect = answer?.userAnswer === correctOption?.id;
    
    if (isCorrect) correct++;
    
    if (!byDimension[q.dimension]) {
      byDimension[q.dimension] = { total: 0, correct: 0 };
    }
    byDimension[q.dimension].total++;
    if (isCorrect) byDimension[q.dimension].correct++;
  }
  
  const score = Math.round(correct / ASSESSMENT_QUESTIONS * 100);
  const levelInfo = getAssessmentLevel(score);
  
  userData.assessment.result = {
    score,
    correct,
    wrong: ASSESSMENT_QUESTIONS - correct,
    level: levelInfo.level,
    byDimension,
    completedAt: new Date().toISOString()
  };
  
  // 标记用户已完成测评
  userData.assessmentCompleted = true;
  userData.level = levelInfo.level;
  
  saveUserData(userId, userData);
  
  return showAssessmentResult(userData);
}

// 显示测评结果
function showAssessmentResult(userData) {
  const result = userData.assessment?.result;
  if (!result) {
    return { result: '❌ 暂无测评结果，发送 /入学测评 开始测评。' };
  }
  
  const levelInfo = getAssessmentLevel(result.score);
  
  let report = `🎓 入学测评报告\n`;
  report += '═'.repeat(30) + '\n\n';
  
  report += `📊 总得分: ${result.score}/100\n`;
  report += `🏆 评估等级: ${levelInfo.level}\n`;
  report += `📝 正确: ${result.correct}/20 题\n\n`;
  
  report += `📈 各维度表现:\n`;
  for (const [dim, data] of Object.entries(result.byDimension)) {
    const pct = Math.round(data.correct / data.total * 100);
    report += `  ${dim}: ${data.correct}/${data.total} (${pct}%)\n`;
  }
  
  report += `\n💡 学习建议:\n`;
  report += `${levelInfo.recommendation}\n\n`;
  
  report += `🎯 推荐学习路径:\n`;
  if (result.score >= 80) {
    report += `1. 直接做 /模拟考试 检验水平\n`;
    report += `2. 针对薄弱维度专项练习\n`;
    report += `3. 考前做几套模拟题冲刺\n`;
  } else if (result.score >= 60) {
    report += `1. 每天 /练习 20题保持手感\n`;
    report += `2. 薄弱维度专项 /基础知识 /专业知识\n`;
    report += `3. 定期 /错题复习 消灭错题\n`;
  } else {
    report += `1. 从 /基础知识 开始系统学习\n`;
    report += `2. 每天 /练习 10题循序渐进\n`;
    report += `3. 建立 /错题本 重点突破\n`;
  }
  
  report += `\n发送 /帮助 查看所有命令`;
  
  return { result: report };
}

// 格式化测评题目
function formatAssessmentQuestion(question, index, total, timeLeft) {
  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  
  let text = `【入学测评】第 ${index}/${total} 题\n`;
  text += `⏱️ 剩余时间: ${minutes}:${seconds.toString().padStart(2, '0')}\n\n`;
  text += `【${question.dimension}】${question.content}\n\n`;
  
  question.options?.forEach(opt => {
    text += `${opt.id}. ${opt.text}\n`;
  });
  
  text += '\n请回复 A/B/C/D/E 作答';
  
  return { result: text };
}

export default assessmentCommand;
