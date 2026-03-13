// Coach Tool - 学习教练功能模块 (编译后版本)
// 无状态设计，通过 userId 支持多用户
// 优化版：用户说"继续"才出下一题，支持数字1-4

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = process.env.COACH_DATA_DIR || './data';

// 用户数据路径
function getUserDataPath(userId) {
  return path.join(DATA_DIR, 'students', `${userId}.json`);
}

// 加载用户数据
function loadUserData(userId) {
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
function saveUserData(userId, data) {
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
function loadQuestionBank() {
  try {
    const dataPath = path.join(DATA_DIR, 'questions.json');
    const data = fs.readFileSync(dataPath, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    console.error('[CoachTool] 题库加载失败:', e);
    return { questions: [] };
  }
}

// AI 自动分析错因
function analyzeErrorReason(question, userAnswer) {
  const correctAnswer = question.correctAnswer;
  const options = ['A', 'B', 'C', 'D'];
  const userIdx = options.indexOf(userAnswer);
  const correctIdx = options.indexOf(correctAnswer);
  
  if (Math.abs(userIdx - correctIdx) === 1) {
    return '粗心大意';
  }
  
  const difficulty = question.difficulty || 'medium';
  const subject = question.subjectId || '';
  
  if (difficulty === 'hard') {
    if (subject.includes('blood') || subject.includes('transfusion')) {
      return '概念混淆';
    }
    return '知识盲区';
  }
  
  if (difficulty === 'medium') {
    return '题型不熟';
  }
  
  return '粗心大意';
}

// 主函数
export async function coachTool(command, userId, platform, adminIds) {
  // 处理空消息
  if (!command || command.trim() === '') {
    return { result: '👋 欢迎使用学习教练！\n\n发送 /帮助 查看可用命令。' };
  }
  
  const trimmed = command.trim();
  const userData = loadUserData(userId);
  const isAdmin = adminIds.includes(userId);

  // ========== 管理员命令 ==========
  if (isAdmin && (trimmed === '/学生列表' || trimmed === '/students' || trimmed === '/学生')) {
    const studentsDir = path.join(DATA_DIR, 'students');
    if (!fs.existsSync(studentsDir)) return { result: '📋 暂无已激活学生。' };
    
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

  if (isAdmin && (trimmed === '/统计' || trimmed === '/stats' || trimmed === '/tj')) {
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

  if (isAdmin && (trimmed === '/生成激活码' || trimmed === '/gen')) {
    const code = `STU-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    return { result: `✅ 新激活码：${code}\n\n将此码发给学生即可激活。` };
  }

  if (isAdmin && (trimmed === '/模式' || trimmed === '/mode' || trimmed === '/ms')) {
    return { result: '🎯 当前模式：管理员\n\n可用命令：\n• /生成激活码\n• /学生列表\n• /统计\n• /切换' };
  }

  if (isAdmin && (trimmed === '/切换' || trimmed === '/qh')) {
    return { result: '✅ 已切换到学生模式，发送 /恢复 可恢复管理员身份。' };
  }

  if (isAdmin && trimmed === '/切换') {
    return { result: '✅ 已切换到学生模式，发送 /恢复 可恢复管理员身份。' };
  }

  // ========== 学生命令 ==========
  if (trimmed === '/练习' || trimmed === '/lx') {
    // 检查是否已激活
    if (!userData) {
      return {
        result: `👋 欢迎使用学习教练！\n\n请输入你的激活码以开始使用。\n\n示例激活码：\n• COACH-DEMO-001\n• COACH-DEMO-002\n\n没有激活码？联系管理员获取。`
      };
    }
    return generateQuestion(userId, userData, platform);
  }

  if (trimmed === '/错题' || trimmed === '/ct' || trimmed === '/cw') {
    if (!userData) {
      return { result: '❌ 请先发送激活码激活。' };
    }
    const wrongs = userData?.wrongAnswers || [];
    if (wrongs.length === 0) return { result: '🎉 还没有错题，继续保持！' };
    
    // 展示最近5道错题
    let output = `🔄 错题复习\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    output += `📚 共 ${wrongs.length} 道错题，展示最近 ${Math.min(5, wrongs.length)} 道：\n\n`;
    
    const recentWrongs = wrongs.slice(-5).reverse();
    recentWrongs.forEach((w, idx) => {
      output += `${idx + 1}. ${w.question?.substring(0, 30) || '题目'}...\n`;
      output += `   你的答案：${w.yourAnswer} | 正确答案：${w.correctAnswer}\n`;
      output += `   错因：${w.reason}\n\n`;
    });
    
    output += '💡 发送 /练习 开始针对性练习';
    return { result: output };
  }

  if (trimmed === '/进度' || trimmed === '/jd' || trimmed === '/progress' || trimmed === '/tj') {
    if (!userData) {
      return { result: '❌ 请先发送激活码激活。' };
    }
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

    const filled = Math.round(acc / 10);
    const empty = 10 - filled;
    output += '📈 正确率\n';
    output += `  [${'█'.repeat(filled)}${'░'.repeat(empty)}] ${acc}%`;

    return { result: output };
  }

  if (trimmed === '/分析' || trimmed === '/fx' || trimmed === '/br') {
    if (!userData) {
      return { result: '❌ 请先发送激活码激活。' };
    }
    const wrongs = userData?.wrongAnswers || [];
    if (wrongs.length === 0) {
      return {
        result: '📊 薄弱点分析报告\n\n📚 科目：输血检验\n\n🎉 还没有足够的错题数据，多做几道题再来分析吧！\n\n💡 总体建议：\n继续加油，查漏补缺！\n\n发送 /练习 开始针对性训练'
      };
    }

    const reasons = {};
    wrongs.forEach((w) => {
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

  if (trimmed === '/徽章' || trimmed === '/bj' || trimmed === '/badge' || trimmed === '/ch') {
    if (!userData) {
      return { result: '❌ 请先发送激活码激活。' };
    }
    const badges = [];
    if ((userData?.totalQuestions || 0) >= 10) badges.push('🌱 初学者');
    if ((userData?.correctAnswers || 0) >= 10) badges.push('🎯 答题能手');
    if ((userData?.streakDays || 0) >= 7) badges.push('🔥 连续打卡7天');

    if (badges.length === 0) {
      return { result: '🏅 还没有徽章，继续加油！\n\n💡 提示：答题10道获得🌱初学者徽章' };
    }
    return { result: `🏅 我的徽章\n\n${badges.join('\n')}` };
  }

  if (trimmed === '/打卡' || trimmed === '/dk' || trimmed === '/checkin' || trimmed === '/qd') {
    if (!userData) {
      return { result: '❌ 请先发送激活码激活。' };
    }
    const s = userData || { streakDays: 0 };
    return {
      result: `🌱 第${s.streakDays || 1}天学习，好的开始！\n\n💡 建议：基础还需巩固，建议从简单题开始，理解概念后再做题。`
    };
  }

  if (trimmed === '/菜单' || trimmed === '/帮助' || trimmed === '/help' || trimmed === '/bz') {
    return {
      result: `📖 学习教练帮助\n\n【命令菜单】\n1. /练习 - 开始练习题\n2. /进度 - 查看学习统计\n3. /错题 - 错题复习\n4. /分析 - 薄弱点分析\n5. /徽章 - 成就徽章\n6. /打卡 - 学习打卡\n7. /帮助 - 显示帮助\n\n【自然语言】\n• "练习"/"做题"/"来一题" → 开始练习\n• "进度"/"成绩" → 查看统计\n• "错题"/"错了哪些" → 错题复习\n• "继续"/"下一题" → 出下一题`
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

    // 验证激活码格式
    const validPrefixes = ['COACH-DEMO', 'STUDENT2024', 'STU-'];
    const isValidFormat = validPrefixes.some(prefix => trimmed.startsWith(prefix));
    
    if (!isValidFormat) {
      return { result: '❌ 无效激活码，请检查输入或联系管理员获取。' };
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

  // ========== 继续下一题 ==========
  if (/^(继续|下一题|jt|xyt)$/.test(trimmed)) {
    if (!userData?.waitingForContinue) {
      return { result: '请先发送 /练习 开始答题。' };
    }

    // 清除等待状态
    delete userData.waitingForContinue;
    delete userData.lastQuestionResult;
    delete userData.currentQuestion;
    saveUserData(userId, userData);

    // 出下一题
    return generateQuestion(userId, userData, platform);
  }

  // ========== 答题（支持数字 1-4 和字母 A-D）==========
  if (/^[1-4A-Da-d]$/.test(trimmed)) {
    if (!userData?.currentQuestion) {
      return { result: '请先发送 /练习 开始答题。' };
    }

    const question = userData.currentQuestion;
    // 转换数字到字母
    const answerMap = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
    const answer = answerMap[trimmed] || trimmed.toUpperCase();
    const isCorrect = answer === question.correctAnswer;

    // 更新统计
    userData.totalQuestions++;
    if (isCorrect) {
      userData.correctAnswers++;
    } else {
      if (!userData.wrongAnswers) userData.wrongAnswers = [];
      const errorReason = analyzeErrorReason(question, answer);
      userData.wrongAnswers.push({
        questionId: question.id,
        question: question.content,
        yourAnswer: answer,
        correctAnswer: question.correctAnswer,
        reason: errorReason,
        timestamp: new Date().toISOString(),
      });
    }

    // 设置等待状态
    userData.waitingForContinue = true;
    userData.lastQuestionResult = { isCorrect, answer, question };
    saveUserData(userId, userData);

    const acc = Math.round((userData.correctAnswers / userData.totalQuestions) * 100);

    let output = '';
    if (isCorrect) {
      output += '✅ 对了！\n';
      output += '━━━━━━━━━━━━━━━━━━━━\n\n';
      output += '能简单说说为什么选这个吗？🤔\n\n';
      output += '📖 解析：\n';
      output += `${question.explanation || '无解析'}\n\n`;
    } else {
      output += '❌ 错了，别灰心！\n';
      output += '━━━━━━━━━━━━━━━━━━━━\n\n';
      output += '📖 先理解这个知识点：\n';
      output += `${question.explanation || '暂无解析'}\n\n`;
      output += `✅ 正确答案：${question.correctAnswer}\n\n`;
      output += `📚 知识点：${question.subjectId || '输血检验'}\n\n`;
      output += '🤔 你当时是怎么想的？\n';
      output += '（回复你的想法，或直接发送"继续"下一题）\n';
    }

    output += '📊 学习统计\n';
    output += '────────────────────\n';
    output += `📋 总题数：${userData.totalQuestions}\n`;
    output += `🎯 正确率：${acc}%\n`;
    output += `🔥 连续打卡：${userData.streakDays || 1}天\n\n`;

    if (!isCorrect) {
      output += '📝 错题已记录\n\n';
    }

    output += '（想明白后回复"继续"出下一题）';

    return { result: output };
  }

  // ========== 帮助 ==========
  if (trimmed === '/帮助' || trimmed === '/help') {
    return {
      result: `📖 学习教练帮助\n\n【命令菜单】\n1. /练习 - 开始练习题\n2. /进度 - 查看学习统计\n3. /错题 - 错题复习\n4. /分析 - 薄弱点分析\n5. /徽章 - 成就徽章\n6. /打卡 - 学习打卡\n7. /帮助 - 显示帮助\n\n【自然语言】\n• "练习"/"做题"/"来一题" → 开始练习\n• "进度"/"成绩" → 查看统计\n• "错题"/"错了哪些" → 错题复习\n• "继续"/"下一题" → 出下一题`
    };
  }

  // ========== 自然语言处理 ==========
  if (/^(练习|做题|答题|来一题|开始练习|我要练习|我想做题|lx|zt|practice|start)$/.test(trimmed) ||
      trimmed.includes('做道题') || trimmed.includes('来道题') || trimmed.includes('做题')) {
    if (!userData) {
      return {
        result: `👋 欢迎使用学习教练！\n\n请输入你的激活码以开始使用。\n\n示例激活码：\n• COACH-DEMO-001\n• COACH-DEMO-002\n\n没有激活码？联系管理员获取。`
      };
    }
    return generateQuestion(userId, userData, platform);
  }

  if (/^(进度|统计|成绩|多少分|正确率|jd|tj|progress|stats)$/.test(trimmed) ||
      trimmed.includes('正确率') || trimmed.includes('成绩')) {
    return coachTool('/进度', userId, platform, adminIds);
  }

  if (/^(错题|错|复习|错了哪些|错题本|ct|cw|wrong|review)$/.test(trimmed) ||
      trimmed.includes('错题') || trimmed.includes('错了')) {
    return coachTool('/错题', userId, platform, adminIds);
  }

  if (/^(分析|薄弱|哪里不行|弱点|fx|br|analysis|weak)$/.test(trimmed) ||
      trimmed.includes('薄弱') || trimmed.includes('分析')) {
    return coachTool('/分析', userId, platform, adminIds);
  }

  if (/^(徽章|成就|奖励|bj|ch|badge|achievement)$/.test(trimmed) ||
      trimmed.includes('徽章') || trimmed.includes('成就')) {
    return coachTool('/徽章', userId, platform, adminIds);
  }

  if (/^(打卡|签到|来了|开始学习|dk|qd|checkin|sign)$/.test(trimmed) ||
      trimmed.includes('打卡')) {
    return coachTool('/打卡', userId, platform, adminIds);
  }

  if (/^(帮助|怎么|怎么用|不会|bz|help|\?)$/.test(trimmed) ||
      trimmed.startsWith('怎么') || trimmed.includes('帮助')) {
    return coachTool('/帮助', userId, platform, adminIds);
  }

  // 友好问候
  if (/^(你好|您好|hello|hi|hey)$/.test(trimmed)) {
    return {
      result: `👋 你好！我是你的学习教练。\n\n发送 /帮助 查看可用命令，或发送 /练习 开始做题！`
    };
  }

  // 默认回复 - 未知命令
  return {
    result: `❓ 我不太理解「${command}」\n\n你可以试试：\n• /练习 - 开始练习题\n• /进度 - 查看学习进度\n• /帮助 - 显示完整帮助`
  };
}

// 生成题目
function generateQuestion(userId, userData, platform) {
  const bank = loadQuestionBank();
  if (bank.questions.length === 0) {
    return { result: '❌ 题库加载失败' };
  }

  const question = bank.questions[Math.floor(Math.random() * bank.questions.length)];

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
  delete updatedData.waitingForContinue;
  delete updatedData.lastQuestionResult;
  saveUserData(userId, updatedData);

  let output = '📝 练习题\n';
  output += '━━━━━━━━━━━━━━━━━━━━\n\n';

  const subjectMap = {
    'blood_basic': '血液学基础',
    'clinical_transfusion': '临床输血',
    'blood_quality': '血液质量',
    'immunohematology': '免疫血液学',
    'transfusion_reaction': '输血反应',
    'component_therapy': '成分输血',
    'apheresis': '单采技术'
  };
  const subjectName = subjectMap[question.subjectId] || question.subjectId || '医学检验';
  const diffMap = { 'easy': '简单', 'medium': '中等', 'hard': '困难' };
  const diffName = diffMap[question.difficulty] || question.difficulty || '中等';

  output += `📚 ${subjectName}  |  ${diffName}\n\n`;
  output += `${question.content}\n\n`;

  if (question.options) {
    output += '────────────────────\n';
    // 统一用数字 1-4
    const optionMap = { 'A': '1', 'B': '2', 'C': '3', 'D': '4' };
    question.options.forEach((opt) => {
      const numId = optionMap[opt.id] || opt.id;
      output += `${numId}. ${opt.text}\n`;
    });
  }

  output += '\n━━━━━━━━━━━━━━━━━━━━\n';
  output += '💡 请回复 1/2/3/4 选择答案';
  
  return { result: output, data: { question } };
}

console.log('[CoachTool] 学习教练 Tool 已加载');
