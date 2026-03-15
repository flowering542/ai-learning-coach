// Analytics Module - 学习数据分析
// 可视化学习效果，预测考试成绩

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = process.env.COACH_DATA_DIR || './data';
const PASS_SCORE = 60;

// 加载用户数据
function loadUserData(userId) {
  try {
    const filePath = path.join(DATA_DIR, 'students', `${userId}.json`);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error('[Analytics] 加载用户数据失败:', e);
  }
  return null;
}

// 加载考试数据
function loadExamData(userId) {
  try {
    const filePath = path.join(DATA_DIR, 'exams', `${userId}.json`);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error('[Analytics] 加载考试数据失败:', e);
  }
  return null;
}

// 计算学习天数
function calculateStudyDays(userData) {
  if (!userData?.stats?.startDate) return 0;
  const start = new Date(userData.stats.startDate);
  const now = new Date();
  return Math.floor((now - start) / (1000 * 60 * 60 * 24));
}

// 计算各维度正确率
function calculateDimensionAccuracy(userData) {
  const dimensions = ['基础知识', '相关专业知识', '专业知识', '专业实践'];
  const result = {};
  
  for (const dim of dimensions) {
    const dimQuestions = userData?.practiceHistory?.filter(p => p.dimension === dim) || [];
    if (dimQuestions.length === 0) {
      result[dim] = { total: 0, correct: 0, accuracy: 0 };
      continue;
    }
    
    const correct = dimQuestions.filter(p => p.isCorrect).length;
    result[dim] = {
      total: dimQuestions.length,
      correct,
      accuracy: Math.round(correct / dimQuestions.length * 100)
    };
  }
  
  return result;
}

// 预测考试分数
function predictExamScore(userData) {
  const dimAccuracy = calculateDimensionAccuracy(userData);
  
  // 加权计算预测分数（各维度25%）
  let predictedScore = 0;
  for (const dim of Object.values(dimAccuracy)) {
    predictedScore += (dim.accuracy || 0) * 0.25;
  }
  
  // 如果有模拟考试记录，加权平均
  const examData = loadExamData(userData?.userId);
  if (examData?.result?.score) {
    predictedScore = predictedScore * 0.6 + examData.result.score * 0.4;
  }
  
  return Math.round(predictedScore);
}

// 生成进度条
function progressBar(percentage, length = 20) {
  const filled = Math.round(percentage / 100 * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

// ========== 主函数 ==========

export async function analyticsCommand(command, userId) {
  const trimmed = command.trim();
  const userData = loadUserData(userId);
  
  if (!userData || !userData.stats) {
    return { 
      result: '📊 暂无学习数据\n\n发送 /练习 开始学习，数据将自动记录。' 
    };
  }
  
  // 数据分析报告
  if (trimmed === '/数据分析' || trimmed === '/analytics') {
    const stats = userData.stats;
    const dimAccuracy = calculateDimensionAccuracy(userData);
    const predictedScore = predictExamScore(userData);
    const studyDays = calculateStudyDays(userData);
    const wrongCount = userData.wrongQuestions?.length || 0;
    
    let report = '📊 学习数据分析报告\n';
    report += '═'.repeat(30) + '\n\n';
    
    // 基础统计
    report += '📈 基础统计\n';
    report += `总答题数: ${stats.total} 题\n`;
    report += `正确: ${stats.correct} | 错误: ${stats.wrong}\n`;
    report += `正确率: ${stats.total > 0 ? Math.round(stats.correct/stats.total*100) : 0}%\n`;
    report += `学习天数: ${studyDays} 天\n`;
    report += `错题本: ${wrongCount} 题\n\n`;
    
    // 各维度正确率
    report += '📊 各维度正确率\n';
    for (const [dim, data] of Object.entries(dimAccuracy)) {
      const bar = progressBar(data.accuracy);
      report += `${dim}\n`;
      report += `${bar} ${data.accuracy}% (${data.correct}/${data.total})\n\n`;
    }
    
    // 预测与建议
    report += '🔮 考试预测\n';
    report += `预测分数: ${predictedScore}/100\n`;
    
    if (predictedScore >= PASS_SCORE) {
      report += `✅ 预计通过考试（及格线${PASS_SCORE}分）\n`;
    } else {
      report += `⚠️ 预计未通过，还需努力（及格线${PASS_SCORE}分）\n`;
    }
    
    // 薄弱维度提醒
    const weakDimensions = Object.entries(dimAccuracy)
      .filter(([_, data]) => data.accuracy < PASS_SCORE && data.total > 0)
      .sort((a, b) => a[1].accuracy - b[1].accuracy);
    
    if (weakDimensions.length > 0) {
      report += '\n⚡ 薄弱维度（需加强）\n';
      weakDimensions.slice(0, 2).forEach(([dim, data]) => {
        report += `• ${dim}: ${data.accuracy}%\n`;
      });
      report += '\n建议: 发送 /' + weakDimensions[0][0] + ' 专项练习';
    }
    
    return { result: report };
  }
  
  // 趋势分析（最近7天）
  if (trimmed === '/趋势' || trimmed === '/trend') {
    const history = userData.practiceHistory || [];
    
    if (history.length === 0) {
      return { result: '📈 暂无趋势数据，多练习几天后查看。' };
    }
    
    // 按日期分组统计
    const byDate = {};
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      byDate[dateStr] = { total: 0, correct: 0 };
    }
    
    history.forEach(h => {
      const dateStr = h.timestamp?.split('T')[0];
      if (byDate[dateStr]) {
        byDate[dateStr].total++;
        if (h.isCorrect) byDate[dateStr].correct++;
      }
    });
    
    let report = '📈 最近7天学习趋势\n';
    report += '═'.repeat(30) + '\n\n';
    
    for (const [date, data] of Object.entries(byDate)) {
      const day = date.slice(5); // MM-DD
      const accuracy = data.total > 0 ? Math.round(data.correct/data.total*100) : 0;
      const bar = progressBar(accuracy, 10);
      report += `${day} ${bar} ${data.total > 0 ? accuracy + '%' : '-'} (${data.total}题)\n`;
    }
    
    return { result: report };
  }
  
  return { result: '未知命令，发送 /数据分析 或 /趋势' };
}

export default analyticsCommand;
