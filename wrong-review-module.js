// Wrong Question Review Module - 错题复习功能
// 专门练习错题，做对3次后移除

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = process.env.COACH_DATA_DIR || './data';

// 加载用户数据
function loadUserData(userId) {
  try {
    const filePath = path.join(DATA_DIR, 'students', `${userId}.json`);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error('[WrongReview] 加载用户数据失败:', e);
  }
  return { userId, wrongQuestions: [], stats: { total: 0, correct: 0 } };
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
    console.error('[WrongReview] 保存用户数据失败:', e);
  }
}

// 加载题库
function loadQuestionBank() {
  try {
    const dataPath = path.join(DATA_DIR, 'questions-v2-final.json');
    return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } catch (e) {
    console.error('[WrongReview] 题库加载失败:', e);
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

export async function wrongReviewCommand(command, userId) {
  const trimmed = command.trim();
  const userData = loadUserData(userId);
  const bank = loadQuestionBank();
  
  // 错题列表
  if (trimmed === '/错题列表' || trimmed === '/wronglist') {
    const wrongList = userData.wrongQuestions || [];
    if (wrongList.length === 0) {
      return { result: '🎉 还没有错题，继续保持！' };
    }
    
    // 按维度统计
    const byDimension = {};
    wrongList.forEach(w => {
      byDimension[w.dimension] = (byDimension[w.dimension] || 0) + 1;
    });
    
    let response = `📋 错题本 (${wrongList.length}题)\n\n`;
    response += '按维度分布：\n';
    Object.entries(byDimension).forEach(([dim, count]) => {
      response += `  ${dim}: ${count}题\n`;
    });
    
    response += '\n发送 /错题复习 开始消灭错题！';
    return { result: response };
  }
  
  // 开始错题复习
  if (trimmed === '/错题复习' || trimmed === '/wrongreview') {
    const wrongList = userData.wrongQuestions || [];
    if (wrongList.length === 0) {
      return { result: '🎉 太棒了！错题本为空，无需复习。\n发送 /练习 继续学习新题。' };
    }
    
    // 获取错题对应的完整题目
    const wrongQuestionIds = wrongList.map(w => w.questionId);
    const wrongQuestions = bank.questions.filter(q => 
      wrongQuestionIds.includes(q.id)
    );
    
    if (wrongQuestions.length === 0) {
      return { result: '❌ 错题数据异常，请重新开始练习。' };
    }
    
    // 设置复习模式
    userData.currentMode = 'wrong_review';
    userData.wrongReviewQuestions = shuffleArray(wrongQuestions);
    userData.wrongReviewIndex = 0;
    saveUserData(userId, userData);
    
    const firstQ = userData.wrongReviewQuestions[0];
    const wrongInfo = wrongList.find(w => w.questionId === firstQ.id);
    
    return formatWrongQuestion(firstQ, wrongInfo, 1, wrongQuestions.length);
  }
  
  // 检查是否在错题复习模式
  if (userData.currentMode !== 'wrong_review') {
    return { result: '❌ 没有进行中的错题复习，发送 /错题复习 开始。' };
  }
  
  const reviewQuestions = userData.wrongReviewQuestions || [];
  const currentIndex = userData.wrongReviewIndex || 0;
  
  // 答题
  if (/^[A-Ea-e]$/.test(trimmed)) {
    const answer = trimmed.toUpperCase();
    const currentQ = reviewQuestions[currentIndex];
    const correctOption = currentQ.options.find(o => o.isCorrect);
    const isCorrect = correctOption?.id === answer;
    
    let response = '';
    
    if (isCorrect) {
      response += '✅ 回答正确！\n\n';
      
      // 更新错题记录（做对次数+1）
      const wrongList = userData.wrongQuestions || [];
      const wrongIndex = wrongList.findIndex(w => w.questionId === currentQ.id);
      
      if (wrongIndex >= 0) {
        wrongList[wrongIndex].correctCount = (wrongList[wrongIndex].correctCount || 0) + 1;
        
        // 做对3次，从错题本移除
        if (wrongList[wrongIndex].correctCount >= 3) {
          const removed = wrongList.splice(wrongIndex, 1)[0];
          response += `🎉 恭喜！这道题已做对3次，从错题本移除！\n`;
          response += `题目：${currentQ.content.substring(0, 50)}...\n\n`;
        }
      }
      
      userData.wrongQuestions = wrongList;
    } else {
      response += '❌ 回答错误！\n\n';
      response += `正确答案：${correctOption?.id}\n`;
      response += `解析：${currentQ.explanation?.substring(0, 150) || '暂无解析'}...\n\n`;
    }
    
    // 下一题
    userData.wrongReviewIndex = currentIndex + 1;
    saveUserData(userId, userData);
    
    // 检查是否完成
    if (userData.wrongReviewIndex >= reviewQuestions.length) {
      const remainingWrong = userData.wrongQuestions?.length || 0;
      response += `\n🎉 错题复习完成！\n`;
      response += `剩余错题：${remainingWrong}题\n`;
      response += `发送 /错题复习 继续消灭错题，或 /练习 学习新题。`;
      userData.currentMode = null;
      saveUserData(userId, userData);
      return { result: response };
    }
    
    // 显示下一题
    const nextQ = reviewQuestions[userData.wrongReviewIndex];
    const wrongList = userData.wrongQuestions || [];
    const wrongInfo = wrongList.find(w => w.questionId === nextQ.id);
    
    response += `\n---\n\n`;
    const nextFormatted = formatWrongQuestion(nextQ, wrongInfo, userData.wrongReviewIndex + 1, reviewQuestions.length);
    return { result: response + nextFormatted.result };
  }
  
  // 显示当前题目
  const currentQ = reviewQuestions[currentIndex];
  const wrongList = userData.wrongQuestions || [];
  const wrongInfo = wrongList.find(w => w.questionId === currentQ.id);
  return formatWrongQuestion(currentQ, wrongInfo, currentIndex + 1, reviewQuestions.length);
}

// 格式化错题
function formatWrongQuestion(question, wrongInfo, index, total) {
  const correctCount = wrongInfo?.correctCount || 0;
  const remaining = 3 - correctCount;
  
  let text = `【错题复习】第 ${index}/${total} 题\n`;
  text += `🎯 再做对 ${remaining} 次即可消灭此题\n\n`;
  text += `【${question.dimension}】${question.content}\n\n`;
  
  question.options?.forEach(opt => {
    text += `${opt.id}. ${opt.text}\n`;
  });
  
  text += '\n请回复 A/B/C/D/E 作答';
  text += '\n发送 /错题列表 查看所有错题';
  
  return { result: text };
}

export default wrongReviewCommand;
