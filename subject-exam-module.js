// Subject-based Exam Module - 分科模拟考试
// 真实考试模式：4科分开，每科90分钟

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = process.env.COACH_DATA_DIR || './data';
const SUBJECT_EXAM_DURATION = 90 * 60 * 1000; // 90分钟（毫秒）
const QUESTIONS_PER_SUBJECT = 100; // 每科100题（根据实际调整）

const SUBJECTS = [
  { id: 'basic', name: '基础知识', time: '8:30-10:00' },
  { id: 'related', name: '相关专业知识', time: '10:45-12:15' },
  { id: 'professional', name: '专业知识', time: '14:00-15:30' },
  { id: 'practice', name: '专业实践能力', time: '16:15-17:45' }
];

// 加载用户数据
function loadUserData(userId) {
  try {
    const filePath = path.join(DATA_DIR, 'students', `${userId}.json`);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error('[SubjectExam] 加载用户数据失败:', e);
  }
  return { userId, subjectExams: {} };
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
    console.error('[SubjectExam] 保存用户数据失败:', e);
  }
}

// 加载题库
function loadQuestionBank() {
  try {
    const dataPath = path.join(DATA_DIR, 'questions-v2-final.json');
    return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } catch (e) {
    console.error('[SubjectExam] 题库加载失败:', e);
    return { questions: [] };
  }
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

// ========== 主函数 ==========

export async function subjectExamCommand(command, userId) {
  const trimmed = command.trim();
  const userData = loadUserData(userId);
  const bank = loadQuestionBank();
  
  // 开始分科模拟考试
  if (trimmed === '/模拟考试-分科' || trimmed === '/exam-subject') {
    // 显示科目选择
    let response = '📝 分科模拟考试\n';
    response += '═'.repeat(30) + '\n\n';
    response += '真实考试安排（4月25日）：\n\n';
    
    SUBJECTS.forEach((subject, index) => {
      const examData = userData.subjectExams?.[subject.id];
      const status = examData?.completed ? '✅' : '⏳';
      response += `${index + 1}. ${status} ${subject.name}\n`;
      response += `   时间: ${subject.time} (90分钟)\n`;
      if (examData?.score !== undefined) {
        response += `   上次成绩: ${examData.score}分\n`;
      }
      response += '\n';
    });
    
    response += '发送 /考+科目编号 开始对应科目\n';
    response += '例如: /考1 开始基础知识模拟\n\n';
    response += '或发送 /考全部 按顺序完成4科';
    
    return { result: response };
  }
  
  // 选择具体科目
  const subjectMatch = trimmed.match(/^\/考(\d)$/);
  if (subjectMatch) {
    const subjectIndex = parseInt(subjectMatch[1]) - 1;
    if (subjectIndex < 0 || subjectIndex >= SUBJECTS.length) {
      return { result: '❌ 科目编号错误，请发送 /模拟考试-分科 查看可用科目' };
    }
    
    const subject = SUBJECTS[subjectIndex];
    
    // 检查是否有进行中的考试
    const existingExam = userData.subjectExams?.[subject.id];
    if (existingExam?.status === 'in_progress') {
      const timeLeft = existingExam.endTime - Date.now();
      if (timeLeft > 0) {
        const currentQ = existingExam.questions[existingExam.currentIndex];
        return formatSubjectQuestion(currentQ, subject, existingExam.currentIndex + 1, existingExam.questions.length, timeLeft);
      }
    }
    
    // 生成新试卷
    const dimMap = {
      'basic': '基础知识',
      'related': '相关专业知识',
      'professional': '专业知识',
      'practice': '专业实践'
    };
    
    const dimQuestions = bank.questions.filter(q => q.dimension === dimMap[subject.id]);
    const paper = shuffleArray(dimQuestions).slice(0, QUESTIONS_PER_SUBJECT);
    
    if (paper.length < QUESTIONS_PER_SUBJECT) {
      return { result: `❌ ${subject.name}题库题目不足` };
    }
    
    if (!userData.subjectExams) userData.subjectExams = {};
    
    userData.subjectExams[subject.id] = {
      subjectId: subject.id,
      subjectName: subject.name,
      status: 'in_progress',
      startTime: Date.now(),
      endTime: Date.now() + SUBJECT_EXAM_DURATION,
      questions: paper,
      currentIndex: 0,
      answers: {}
    };
    
    saveUserData(userId, userData);
    
    return {
      result: `📝 ${subject.name} 模拟考试开始！\n\n` +
              `⏱️ 考试时间: 90分钟 (${subject.time})\n` +
              `📋 题目数量: ${QUESTIONS_PER_SUBJECT}题\n` +
              `📊 及格分数: 60分\n\n` +
              `发送 /开始考试 或任意键开始答题！`
    };
  }
  
  // 检查是否有进行中的分科考试
  let currentSubject = null;
  let currentExam = null;
  
  for (const subject of SUBJECTS) {
    const exam = userData.subjectExams?.[subject.id];
    if (exam?.status === 'in_progress') {
      currentSubject = subject;
      currentExam = exam;
      break;
    }
  }
  
  if (!currentExam) {
    return { result: '❌ 没有进行中的分科考试，发送 /模拟考试-分科 开始' };
  }
  
  const timeLeft = currentExam.endTime - Date.now();
  
  // 开始答题
  if (trimmed === '/开始考试' || trimmed === '/start-exam') {
    if (timeLeft <= 0) {
      return submitSubjectExam(userId, userData, currentSubject, currentExam);
    }
    
    const currentQ = currentExam.questions[currentExam.currentIndex];
    return formatSubjectQuestion(currentQ, currentSubject, currentExam.currentIndex + 1, currentExam.questions.length, timeLeft);
  }
  
  // 检查时间是否结束
  if (timeLeft <= 0) {
    return submitSubjectExam(userId, userData, currentSubject, currentExam);
  }
  
  // 答题
  if (/^[A-Ea-e]$/.test(trimmed)) {
    const answer = trimmed.toUpperCase();
    const currentQ = currentExam.questions[currentExam.currentIndex];
    
    currentExam.answers[currentQ.id] = {
      questionId: currentQ.id,
      userAnswer: answer,
      timestamp: Date.now()
    };
    
    currentExam.currentIndex++;
    saveUserData(userId, userData);
    
    // 检查是否答完
    if (currentExam.currentIndex >= currentExam.questions.length) {
      return submitSubjectExam(userId, userData, currentSubject, currentExam);
    }
    
    // 下一题
    const nextQ = currentExam.questions[currentExam.currentIndex];
    return formatSubjectQuestion(nextQ, currentSubject, currentExam.currentIndex + 1, currentExam.questions.length, timeLeft);
  }
  
  // 交卷
  if (trimmed === '/交卷' || trimmed === '/submit') {
    return submitSubjectExam(userId, userData, currentSubject, currentExam);
  }
  
  // 显示当前题目
  const currentQ = currentExam.questions[currentExam.currentIndex];
  return formatSubjectQuestion(currentQ, currentSubject, currentExam.currentIndex + 1, currentExam.questions.length, timeLeft);
}

// 提交科目考试
function submitSubjectExam(userId, userData, subject, exam) {
  exam.status = 'completed';
  exam.completed = true;
  exam.submitTime = Date.now();
  
  let correct = 0;
  
  for (const q of exam.questions) {
    const answer = exam.answers[q.id];
    const correctOption = q.options.find(o => o.isCorrect);
    if (answer?.userAnswer === correctOption?.id) {
      correct++;
    }
  }
  
  const score = Math.round(correct / exam.questions.length * 100);
  const passed = score >= 60;
  
  exam.score = score;
  exam.correct = correct;
  exam.wrong = exam.questions.length - correct;
  exam.passed = passed;
  
  saveUserData(userId, userData);
  
  let report = `📝 ${subject.name} 考试结束！\n\n`;
  report += `${passed ? '🎉 恭喜通过！' : '💪 继续加油！'}\n`;
  report += `📊 得分: ${score}/100 (${passed ? '及格' : '不及格'})\n`;
  report += `✅ 正确: ${correct}/${exam.questions.length}\n`;
  report += `❌ 错误: ${exam.wrong}/${exam.questions.length}\n\n`;
  
  // 检查是否完成全部4科
  const completedSubjects = SUBJECTS.filter(s => 
    userData.subjectExams?.[s.id]?.completed
  );
  
  if (completedSubjects.length === SUBJECTS.length) {
    const totalScore = completedSubjects.reduce((sum, s) => 
      sum + (userData.subjectExams[s.id].score || 0), 0
    );
    const avgScore = Math.round(totalScore / SUBJECTS.length);
    
    report += `🏆 全部4科已完成！\n`;
    report += `📈 平均分: ${avgScore}分\n\n`;
    
    report += `各科成绩:\n`;
    completedSubjects.forEach(s => {
      const sScore = userData.subjectExams[s.id].score;
      report += `  ${s.name}: ${sScore}分\n`;
    });
  } else {
    report += `📚 已完成: ${completedSubjects.length}/4 科\n`;
    report += `发送 /模拟考试-分科 继续下一科`;
  }
  
  return { result: report };
}

// 格式化科目题目
function formatSubjectQuestion(question, subject, index, total, timeLeft) {
  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  
  let text = `【${subject.name}】第 ${index}/${total} 题\n`;
  text += `⏱️ 剩余时间: ${minutes}:${seconds.toString().padStart(2, '0')}\n`;
  text += `🕐 真实考试时间: ${subject.time}\n\n`;
  text += `${question.content}\n\n`;
  
  question.options?.forEach(opt => {
    text += `${opt.id}. ${opt.text}\n`;
  });
  
  text += '\n请回复 A/B/C/D/E 作答';
  text += '\n发送 /交卷 提前交卷';
  
  return { result: text };
}

export default subjectExamCommand;
