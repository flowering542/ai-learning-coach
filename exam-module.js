// Exam Simulation Module - 考试模拟功能
// 真实考试规格：100题，120分钟，4维度各25题

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = process.env.COACH_DATA_DIR || './data';
const EXAM_DURATION = 120 * 60 * 1000; // 120分钟（毫秒）
const EXAM_QUESTIONS = 100;
const PASS_SCORE = 60;

// 加载用户考试数据
function loadExamData(userId) {
  try {
    const filePath = path.join(DATA_DIR, 'exams', `${userId}.json`);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error('[Exam] 加载考试数据失败:', e);
  }
  return null;
}

// 保存考试数据
function saveExamData(userId, data) {
  try {
    const dir = path.join(DATA_DIR, 'exams');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(DATA_DIR, 'exams', `${userId}.json`),
      JSON.stringify(data, null, 2)
    );
  } catch (e) {
    console.error('[Exam] 保存考试数据失败:', e);
  }
}

// 加载题库
function loadQuestionBank() {
  try {
    const dataPath = path.join(DATA_DIR, 'questions-v2-final.json');
    return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } catch (e) {
    console.error('[Exam] 题库加载失败:', e);
    return { questions: [] };
  }
}

// 生成考试试卷（100题，4维度各25题）
function generateExamPaper(bank) {
  const dimensions = ['基础知识', '相关专业知识', '专业知识', '专业实践'];
  const paper = [];
  
  for (const dim of dimensions) {
    const dimQuestions = bank.questions.filter(q => q.dimension === dim);
    const selected = shuffleArray(dimQuestions).slice(0, 25);
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

// 格式化时间（毫秒 → MM:SS）
function formatTime(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// 格式化题目
function formatExamQuestion(question, index, total, timeLeft) {
  let text = `【模拟考试】第 ${index}/${total} 题\n`;
  text += `⏱️ 剩余时间: ${formatTime(timeLeft)}\n\n`;
  text += `【${question.dimension}】${question.content}\n\n`;
  
  question.options?.forEach(opt => {
    text += `${opt.id}. ${opt.text}\n`;
  });
  
  text += '\n请回复 A/B/C/D/E 作答';
  text += '\n发送 /交卷 提前交卷';
  
  return text;
}

// ========== 主函数 ==========

export async function examCommand(command, userId) {
  const trimmed = command.trim();
  const bank = loadQuestionBank();
  
  // 开始考试
  if (trimmed === '/模拟考试' || trimmed === '/exam') {
    // 检查是否有进行中的考试
    const existingExam = loadExamData(userId);
    if (existingExam && existingExam.status === 'in_progress') {
      const timeLeft = existingExam.endTime - Date.now();
      if (timeLeft > 0) {
        // 继续考试
        const currentQ = existingExam.questions[existingExam.currentIndex];
        return {
          result: formatExamQuestion(
            currentQ,
            existingExam.currentIndex + 1,
            EXAM_QUESTIONS,
            timeLeft
          )
        };
      }
    }
    
    // 生成新试卷
    const paper = generateExamPaper(bank);
    if (paper.length < EXAM_QUESTIONS) {
      return { result: '❌ 题库题目不足，无法生成试卷。' };
    }
    
    const examData = {
      userId,
      status: 'in_progress',
      startTime: Date.now(),
      endTime: Date.now() + EXAM_DURATION,
      questions: paper,
      currentIndex: 0,
      answers: {},
      createdAt: new Date().toISOString()
    };
    
    saveExamData(userId, examData);
    
    return {
      result: `📝 模拟考试开始！\n\n` +
              `⏱️ 考试时间: 120分钟\n` +
              `📋 题目数量: 100题\n` +
              `📊 及格分数: 60分\n` +
              `🎯 题目分布: 基础知识25 + 相关专业知识25 + 专业知识25 + 专业实践25\n\n` +
              `考试规则:\n` +
              `• 每题1分，共100分\n` +
              `• 可随时发送 /交卷 提前交卷\n` +
              `• 时间到自动交卷\n\n` +
              `发送 /开始 或任意键开始答题！`
    };
  }
  
  // 加载进行中的考试
  const examData = loadExamData(userId);
  if (!examData || examData.status !== 'in_progress') {
    return { result: '❌ 没有进行中的考试，发送 /模拟考试 开始新考试。' };
  }
  
  const timeLeft = examData.endTime - Date.now();
  
  // 检查时间是否结束
  if (timeLeft <= 0) {
    return submitExam(userId, examData);
  }
  
  // 答题
  if (/^[A-Ea-e]$/.test(trimmed)) {
    const answer = trimmed.toUpperCase();
    const currentQ = examData.questions[examData.currentIndex];
    
    examData.answers[currentQ.id] = {
      questionId: currentQ.id,
      userAnswer: answer,
      dimension: currentQ.dimension,
      timestamp: Date.now()
    };
    
    examData.currentIndex++;
    saveExamData(userId, examData);
    
    // 检查是否答完
    if (examData.currentIndex >= EXAM_QUESTIONS) {
      return submitExam(userId, examData);
    }
    
    // 下一题
    const nextQ = examData.questions[examData.currentIndex];
    return {
      result: formatExamQuestion(nextQ, examData.currentIndex + 1, EXAM_QUESTIONS, timeLeft)
    };
  }
  
  // 交卷
  if (trimmed === '/交卷' || trimmed === '/submit') {
    return submitExam(userId, examData);
  }
  
  // 显示当前题目
  const currentQ = examData.questions[examData.currentIndex];
  return {
    result: formatExamQuestion(currentQ, examData.currentIndex + 1, EXAM_QUESTIONS, timeLeft)
  };
}

// 交卷评分
function submitExam(userId, examData) {
  examData.status = 'completed';
  examData.submitTime = Date.now();
  
  let correct = 0;
  let wrong = 0;
  const byDimension = {};
  
  for (const q of examData.questions) {
    const answer = examData.answers[q.id];
    const correctOption = q.options.find(o => o.isCorrect);
    const isCorrect = answer?.userAnswer === correctOption?.id;
    
    if (isCorrect) {
      correct++;
    } else {
      wrong++;
    }
    
    // 按维度统计
    if (!byDimension[q.dimension]) {
      byDimension[q.dimension] = { total: 0, correct: 0 };
    }
    byDimension[q.dimension].total++;
    if (isCorrect) byDimension[q.dimension].correct++;
  }
  
  const score = correct;
  const passed = score >= PASS_SCORE;
  const timeUsed = Math.floor((examData.submitTime - examData.startTime) / 60000);
  
  examData.result = {
    score,
    correct,
    wrong,
    passed,
    timeUsed,
    byDimension
  };
  
  saveExamData(userId, examData);
  
  // 生成报告
  let report = `📝 考试结束！\n\n`;
  report += `${passed ? '🎉 恭喜通过！' : '💪 继续加油！'}\n`;
  report += `📊 得分: ${score}/100 (${score >= 60 ? '及格' : '不及格'})\n`;
  report += `✅ 正确: ${correct}题\n`;
  report += `❌ 错误: ${wrong}题\n`;
  report += `⏱️ 用时: ${timeUsed}分钟\n\n`;
  
  report += `📈 各维度得分:\n`;
  for (const [dim, stats] of Object.entries(byDimension)) {
    const pct = (stats.correct / stats.total * 100).toFixed(1);
    report += `  ${dim}: ${stats.correct}/${stats.total} (${pct}%)\n`;
  }
  
  report += `\n发送 /模拟考试 开始新考试`;
  
  return { result: report };
}

export default examCommand;
