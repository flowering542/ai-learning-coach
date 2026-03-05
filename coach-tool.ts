// Coach Tool - 学习教练功能模块
// 无状态设计，通过 userId 支持多用户

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = process.env.COACH_DATA_DIR || './data';

// 用户数据路径
function getUserDataPath(userId: string): string {
  return path.join(DATA_DIR, 'students', `${userId}.json`);
}

// 加载用户数据
function loadUserData(userId: string): any {
  try {
    const filePath = getUserDataPath(userId);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) {
    console.error('[CoachTool] 加载用户数据失败:', e);
  }
  return null;
}

// 保存用户数据
function saveUserData(userId: string, data: any): void {
  try {
    const dir = path.join(DATA_DIR, 'students');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(getUserDataPath(userId), JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('[CoachTool] 保存用户数据失败:', e);
  }
}

// 加载题库
function loadQuestionBank(): any {
  try {
    const dataPath = path.join(DATA_DIR, 'questions.json');
    const data = fs.readFileSync(dataPath, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    console.error('[CoachTool] 题库加载失败:', e);
    return { questions: [] };
  }
}

// 生成激活码
function generateCode(): string {
  return `STU-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

// 自然语言意图识别
function recognizeIntent(message: string): string | null {
  const trimmed = message.trim().toLowerCase();
  
  // 练习意图
  if (/^(练习|做题|答题|来一题|开始练习|我要练习|继续|下一题|lx|zt|practice|start)$/.test(trimmed) ||
      trimmed.includes('做道题') || trimmed.includes('来道题')) {
    return '/练习';
  }
  
  // 错题意图
  if (/^(错题|错|复习|错了哪些|错题本|ct|cw|wrong|review)$/.test(trimmed) ||
      trimmed.includes('错题') || trimmed.includes('错了')) {
    return '/错题';
  }
  
  // 进度意图
  if (/^(进度|统计|成绩|多少分|正确率|jd|tj|progress|stats)$/.test(trimmed) ||
      trimmed.includes('正确率') || trimmed.includes('成绩')) {
    return '/进度';
  }
  
  // 分析意图
  if (/^(分析|薄弱|哪里不行|弱点|fx|br|analysis|weak)$/.test(trimmed) ||
      trimmed.includes('薄弱') || trimmed.includes('分析')) {
    return '/分析';
  }
  
  // 徽章意图
  if (/^(徽章|成就|徽章|奖励|bj|ch|badge|achievement)$/.test(trimmed) ||
      trimmed.includes('徽章') || trimmed.includes('成就')) {
    return '/徽章';
  }
  
  // 打卡意图
  if (/^(打卡|签到|来了|开始学习|dk|qd|checkin|sign)$/.test(trimmed) ||
      trimmed.includes('打卡')) {
    return '/打卡';
  }
  
  // 帮助意图
  if (/^(帮助|怎么|怎么用|不会|bz|help|\?)$/.test(trimmed) ||
      trimmed.startsWith('怎么') || trimmed.includes('帮助')) {
    return '/帮助';
  }
  
  return null;
}

// 生成快捷按钮（文本形式）
function generateQuickButtons(): string {
  return `
┌──────────┬──────────┐
│  📝 练习  │  📊 进度  │
├──────────┼──────────┤
│  🔄 错题  │  🏅 徽章  │
└──────────┴──────────┘`;
}

// 主处理函数
export async function coachTool(
  command: string,
  userId: string,
  platform: 'qq' | 'feishu' = 'qq',
  adminIds: string[] = []
): Promise<{ result: string; data?: any }> {
  let trimmed = command.trim();
  
  // 自然语言识别（只有在没有当前题目时才转换）
  let userData = loadUserData(userId);
  if (!userData?.currentQuestion && !trimmed.startsWith('/') && !/^[A-Da-d]$/.test(trimmed)) {
    const intent = recognizeIntent(trimmed);
    if (intent) {
      trimmed = intent;
    }
  }
  
  const isAdmin = adminIds.includes(userId);
  // 重新加载用户数据
  userData = loadUserData(userId);
  
  // ========== 管理员命令 ==========
  if (isAdmin && trimmed === '/模式') {
    return {
      result: '🎯 当前模式：管理员\n\n可用命令：\n• /生成激活码\n• /学生列表\n• /统计\n• /切换'
    };
  }
  
  if (isAdmin && trimmed === '/生成激活码') {
    const code = generateCode();
    return {
      result: `✅ 新激活码：${code}\n\n将此码发给学生即可激活。`,
      data: { code }
    };
  }
  
  if (isAdmin && trimmed === '/学生列表') {
    const studentsDir = path.join(DATA_DIR, 'students');
    if (!fs.existsSync(studentsDir)) {
      return { result: '📋 暂无已激活学生。' };
    }
    
    const files = fs.readdirSync(studentsDir).filter(f => f.endsWith('.json'));
    if (files.length === 0) return { result: '📋 暂无已激活学生。' };
    
    let list = '📋 学生列表\n\n';
    let i = 1;
    for (const file of files) {
      const s = JSON.parse(fs.readFileSync(path.join(studentsDir, file), 'utf-8'));
      const acc = s.totalQuestions > 0 ? Math.round((s.correctAnswers / s.totalQuestions) * 100) : 0;
      list += `${i}. ID:${s.id?.slice(-6) || file.replace('.json', '').slice(-6)} 正确率:${acc}% 🔥${s.streakDays || 0}天\n`;
      i++;
    }
    return { result: list };
  }
  
  if (isAdmin && trimmed === '/统计') {
    const studentsDir = path.join(DATA_DIR, 'students');
    let totalStudents = 0, totalQ = 0, totalC = 0;
    
    if (fs.existsSync(studentsDir)) {
      const files = fs.readdirSync(studentsDir).filter(f => f.endsWith('.json'));
      totalStudents = files.length;
      for (const file of files) {
        const s = JSON.parse(fs.readFileSync(path.join(studentsDir, file), 'utf-8'));
        totalQ += s.totalQuestions || 0;
        totalC += s.correctAnswers || 0;
      }
    }
    
    const acc = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;
    return {
      result: `📊 统计\n\n👥 学生: ${totalStudents}\n📝 答题: ${totalQ}\n✅ 平均正确率: ${acc}%`
    };
  }
  
  if (isAdmin && trimmed === '/切换') {
    return { result: '✅ 已切换到学生模式，发送 /恢复 可恢复管理员身份。' };
  }
  
  // ========== 学生命令 ==========
  if (trimmed === '/练习' || trimmed === '/lx') {
    const bank = loadQuestionBank();
    if (bank.questions.length === 0) {
      return { result: '❌ 题库加载失败' };
    }
    
    const question = bank.questions[Math.floor(Math.random() * bank.questions.length)];
    
    // 保存当前题目到用户数据
    const updatedData = userData || {
      id: `stu_${Date.now()}`,
      userId,
      platform,
      totalQuestions: 0,
      correctAnswers: 0,
      streakDays: 0,
    };
    updatedData.currentQuestion = question;
    updatedData.lastActiveAt = new Date().toISOString();
    saveUserData(userId, updatedData);
    
    let output = '📝 练习题\n';
    output += '━━━━━━━━━━━━━━━━━━━━\n\n';
    
    const subjectMap: Record<string, string> = {
      'blood_basic': '血液学基础',
      'clinical_transfusion': '临床输血',
      'blood_quality': '血液质量',
      'immunohematology': '免疫血液学',
      'transfusion_reaction': '输血反应',
      'component_therapy': '成分输血',
      'apheresis': '单采技术'
    };
    const subjectName = subjectMap[question.subjectId] || question.subjectId || '医学检验';
    const diffMap: Record<string, string> = { 'easy': '简单', 'medium': '中等', 'hard': '困难' };
    const diffName = diffMap[question.difficulty] || question.difficulty || '中等';
    
    output += `📚 ${subjectName}  |  ${diffName}\n\n`;
    output += `${question.content}\n\n`;
    
    if (question.options) {
      output += '────────────────────\n';
      question.options.forEach((opt: any) => {
        output += `${opt.id}. ${opt.text}\n`;
      });
    }
    
    output += '\n━━━━━━━━━━━━━━━━━━━━\n';
    output += '💡 请回复 A/B/C/D 选择答案';
    return { result: output, data: { question } };
  }
  
  if (trimmed === '/错题' || trimmed === '/ct') {
    const wrongs = userData?.wrongAnswers || [];
    if (wrongs.length === 0) return { result: '🎉 还没有错题，继续保持！' };
    return { result: `🔄 错题复习\n\n你有 ${wrongs.length} 道错题\n发送 /练习 开始针对性练习` };
  }
  
  if (trimmed === '/进度' || trimmed === '/progress') {
    const s = userData || { totalQuestions: 0, correctAnswers: 0, streakDays: 0 };
    const acc = s.totalQuestions > 0 ? Math.round((s.correctAnswers / s.totalQuestions) * 100) : 0;
    
    let output = '📊 学习进度\n';
    output += '━━━━━━━━━━━━━━━━━━━━\n\n';
    output += '📋 答题统计\n';
    output += `  总题数：${s.totalQuestions}\n`;
    output += `  正确数：${s.correctAnswers}\n`;
    output += `  正确率：${acc}%\n\n`;
    output += '🔥 连续打卡\n';
    output += `  ${s.streakDays || 0} 天\n\n`;
    
    // 进度条
    const filled = Math.round(acc / 10);
    const empty = 10 - filled;
    output += '📈 正确率\n';
    output += `  [${'█'.repeat(filled)}${'░'.repeat(empty)}] ${acc}%`;
    
    return { result: output };
  }
  
  if (trimmed === '/分析' || trimmed === '/fx') {
    const wrongs = userData?.wrongAnswers || [];
    if (wrongs.length === 0) {
      return {
        result: '📊 薄弱点分析报告\n\n📚 科目：输血检验\n\n🎉 还没有足够的错题数据，多做几道题再来分析吧！\n\n💡 总体建议：\n继续加油，查漏补缺！\n\n发送 /练习 开始针对性训练'
      };
    }
    
    // 统计错因
    const reasons: Record<string, number> = {};
    wrongs.forEach((w: any) => {
      reasons[w.reason] = (reasons[w.reason] || 0) + 1;
    });
    
    let report = '📊 薄弱点分析报告\n\n📚 科目：输血检验\n\n';
    report += `📝 错题总数：${wrongs.length}\n\n`;
    report += '🎯 错因分布：\n';
    Object.entries(reasons).forEach(([reason, count]) => {
      report += `  • ${reason}：${count}道\n`;
    });
    report += '\n💡 建议：针对薄弱点加强练习\n\n发送 /练习 开始针对性训练';
    
    return { result: report };
  }
  
  if (trimmed === '/徽章' || trimmed === '/badge') {
    const badges = [];
    if ((userData?.totalQuestions || 0) >= 10) badges.push('🌱 初学者');
    if ((userData?.correctAnswers || 0) >= 10) badges.push('🎯 答题能手');
    if ((userData?.streakDays || 0) >= 7) badges.push('🔥 连续打卡7天');
    
    if (badges.length === 0) {
      return { result: '🏅 还没有徽章，继续加油！\n\n💡 提示：答题10道获得🌱初学者徽章' };
    }
    return { result: `🏅 我的徽章\n\n${badges.join('\n')}` };
  }
  
  if (trimmed === '/打卡' || trimmed === '/checkin') {
    const s = userData || { streakDays: 0 };
    return {
      result: `🌱 第${s.streakDays || 1}天学习，好的开始！\n\n💡 建议：基础还需巩固，建议从简单题开始，理解概念后再做题。`
    };
  }
  
  if (trimmed === '/恢复') {
    return { result: '✅ 已恢复管理员身份。' };
  }
  
  // ========== 激活码 ==========
  if (trimmed.startsWith('COACH-DEMO') || trimmed.startsWith('STUDENT') || trimmed.startsWith('STU-')) {
    if (userData) {
      return { result: '❌ 你已经激活过了，直接发送 /练习 开始学习。' };
    }
    
    const newUser = {
      id: `stu_${Date.now()}`,
      userId,
      platform,
      activatedAt: new Date().toISOString(),
      activationCode: trimmed,
      totalQuestions: 0,
      correctAnswers: 0,
      lastActiveAt: new Date().toISOString(),
      streakDays: 0,
      wrongAnswers: [],
    };
    
    saveUserData(userId, newUser);
    return {
      result: '🎉 激活成功！欢迎加入学习教练！\n\n可用命令：\n• /练习 - 开始练习题\n• /进度 - 查看学习进度\n• /错题 - 查看错题\n• /分析 - 薄弱点分析\n• /徽章 - 成就徽章\n• /打卡 - 学习打卡'
    };
  }
  
  // ========== 答题 ==========
  if (/^[A-Da-d]$/.test(trimmed)) {
    if (!userData?.currentQuestion) {
      return { result: '请先发送 /练习 开始答题。' };
    }
    
    const question = userData.currentQuestion;
    const answer = trimmed.toUpperCase();
    const isCorrect = answer === question.correctAnswer;
    
    // 更新统计
    userData.totalQuestions++;
    if (isCorrect) {
      userData.correctAnswers++;
    } else {
      // 记录错题
      if (!userData.wrongAnswers) userData.wrongAnswers = [];
      userData.wrongAnswers.push({
        questionId: question.id,
        question: question.content,
        yourAnswer: answer,
        correctAnswer: question.correctAnswer,
        timestamp: new Date().toISOString(),
      });
    }
    
    // 清除当前题目
    delete userData.currentQuestion;
    saveUserData(userId, userData);
    
    const acc = Math.round((userData.correctAnswers / userData.totalQuestions) * 100);
    
    let output = '';
    if (isCorrect) {
      output += '🎉 回答正确！\n';
      output += '━━━━━━━━━━━━━━━━━━━━\n\n';
    } else {
      output += '❌ 回答错误\n';
      output += '━━━━━━━━━━━━━━━━━━━━\n\n';
    }
    
    output += `✅ 正确答案：${question.correctAnswer}\n\n`;
    
    if (question.explanation) {
      output += '📖 解析\n';
      output += '────────────────────\n';
      output += `${question.explanation}\n\n`;
    }
    
    output += '📊 学习统计\n';
    output += '────────────────────\n';
    output += `📋 总题数：${userData.totalQuestions}\n`;
    output += `🎯 正确率：${acc}%\n`;
    output += `🔥 连续打卡：${userData.streakDays || 1}天\n\n`;
    
    if (!isCorrect) {
      output += '📝 错题已记录，发送 /错题 可复习\n\n';
    }
    
    output += '💡 发送 /练习 继续答题';
    
    return { result: output };
  }
  
  // ========== 帮助 ==========
  if (trimmed === '/帮助' || trimmed === '/help') {
    return {
      result: `📖 学习教练帮助\n\n【快捷按钮】${generateQuickButtons()}\n\n【自然语言】\n• "练习"/"做题"/"来一题" → 开始练习\n• "进度"/"成绩" → 查看统计\n• "错题"/"错了哪些" → 错题复习\n• "分析"/"薄弱点" → 薄弱分析\n\n【命令列表】\n• /练习 - 开始练习题\n• /错题 - 复习错题\n• /进度 - 查看学习进度\n• /分析 - 薄弱点分析\n• /徽章 - 成就徽章\n• /打卡 - 学习打卡`
    };
  }
  
  // ========== 访客默认 ==========
  if (!userData) {
    return {
      result: '👋 欢迎使用学习教练！\n\n请输入激活码：\n• COACH-DEMO-001\n• COACH-DEMO-002\n\n没有激活码？联系管理员获取。'
    };
  }
  
  // 未识别命令，显示按钮
  return { 
    result: `🤔 没听懂，试试这些：${generateQuickButtons()}\n\n或发送 /帮助 查看全部命令` 
  };
}

console.log('[CoachTool] 学习教练 Tool 已加载');
