#!/usr/bin/env node
// 学习教练 Sub-agent
// 独立进程，通过 stdio 接收命令，返回结果

import * as fs from 'fs';
import * as path from 'path';

// 数据目录
const DATA_DIR = process.env.COACH_DATA_DIR || './data';
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');

// 简单内存存储（实际应用用 SQLite）
let students = new Map();
let currentQuestions = new Map();

// 加载数据
function loadData() {
  try {
    if (fs.existsSync(STUDENTS_FILE)) {
      const data = JSON.parse(fs.readFileSync(STUDENTS_FILE, 'utf-8'));
      students = new Map(Object.entries(data));
    }
  } catch (e) {
    console.error('[Coach] 加载数据失败:', e);
  }
}

// 保存数据
function saveData() {
  try {
    const obj = {};
    students.forEach((v, k) => obj[k] = v);
    fs.writeFileSync(STUDENTS_FILE, JSON.stringify(obj, null, 2));
  } catch (e) {
    console.error('[Coach] 保存数据失败:', e);
  }
}

// 加载题库
function loadQuestionBank() {
  try {
    const dataPath = path.join(DATA_DIR, 'questions.json');
    const data = fs.readFileSync(dataPath, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    console.error('[Coach] 题库加载失败:', e);
    return { questions: [] };
  }
}

// 处理命令
async function handleCommand(command: string, qqId: string, adminIds: string[]): Promise<string> {
  const trimmed = command.trim();
  const isAdmin = adminIds.includes(qqId);
  const student = students.get(qqId);
  
  // 管理员命令
  if (isAdmin && (trimmed === '/模式' || trimmed === '/mode')) {
    return '🎯 当前模式：管理员\n\n可用命令：\n• /生成激活码\n• /学生列表\n• /统计\n• /切换';
  }
  
  if (isAdmin && trimmed === '/生成激活码') {
    const code = `STU-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    return `✅ 新激活码：${code}\n\n将此码发给学生即可激活。`;
  }
  
  if (isAdmin && trimmed === '/学生列表') {
    if (students.size === 0) return '📋 暂无已激活学生。';
    let list = '📋 学生列表\n\n';
    let i = 1;
    for (const [id, s] of students) {
      const acc = s.totalQuestions > 0 ? Math.round((s.correctAnswers / s.totalQuestions) * 100) : 0;
      list += `${i}. ID:${s.id?.slice(-6) || id.slice(-6)} 正确率:${acc}% 🔥${s.streakDays || 0}天\n`;
      i++;
    }
    return list;
  }
  
  if (isAdmin && trimmed === '/统计') {
    let totalQ = 0, totalC = 0;
    for (const s of students.values()) {
      totalQ += s.totalQuestions || 0;
      totalC += s.correctAnswers || 0;
    }
    const acc = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;
    return `📊 统计\n\n👥 学生: ${students.size}\n📝 答题: ${totalQ}\n✅ 平均正确率: ${acc}%`;
  }
  
  if (isAdmin && trimmed === '/切换') {
    return 'SWITCH_TO_STUDENT';
  }
  
  // 学生命令
  if (trimmed === '/练习' || trimmed === '/lx') {
    const bank = loadQuestionBank();
    if (bank.questions.length === 0) {
      return '❌ 题库加载失败';
    }
    
    const question = bank.questions[Math.floor(Math.random() * bank.questions.length)];
    currentQuestions.set(qqId, question);
    
    let output = `📝 练习题\n\n`;
    output += `【${question.subjectId || '医学检验'} | ${question.difficulty || '中等'}】\n\n`;
    output += `${question.content}\n\n`;
    
    if (question.options) {
      question.options.forEach((opt: any) => {
        output += `${opt.id}. ${opt.text}\n`;
      });
    }
    
    output += `\n💡 请回复 A/B/C/D 选择答案`;
    return output;
  }
  
  if (trimmed === '/错题' || trimmed === '/ct') {
    return '🎉 还没有错题，继续保持！';
  }
  
  if (trimmed === '/进度' || trimmed === '/progress') {
    const s = student || { totalQuestions: 0, correctAnswers: 0, streakDays: 0 };
    const acc = s.totalQuestions > 0 ? Math.round((s.correctAnswers / s.totalQuestions) * 100) : 0;
    return `📊 学习进度\n\n📝 总题数: ${s.totalQuestions}\n✅ 正确率: ${acc}%\n🔥 连续打卡: ${s.streakDays}天`;
  }
  
  if (trimmed === '/分析' || trimmed === '/fx') {
    return '📊 薄弱点分析报告\n\n📚 科目：输血检验\n\n🎉 还没有足够的错题数据，多做几道题再来分析吧！\n\n💡 总体建议：\n继续加油，查漏补缺！\n\n发送 /练习 开始针对性训练';
  }
  
  if (trimmed === '/徽章' || trimmed === '/badge') {
    return '🏅 还没有徽章，继续加油！\n';
  }
  
  if (trimmed === '/打卡' || trimmed === '/checkin') {
    return '🌱 第一天学习，好的开始！\n\n💡 建议：基础还需巩固，建议从简单题开始，理解概念后再做题。';
  }
  
  if (trimmed === '/恢复' && student?.wasAdmin) {
    return 'SWITCH_TO_ADMIN';
  }
  
  // 激活码
  if (trimmed.startsWith('COACH-DEMO') || trimmed.startsWith('STUDENT') || trimmed.startsWith('STU-')) {
    if (student) {
      return '❌ 你已经激活过了，直接发送 /练习 开始学习。';
    }
    
    const newStudent = {
      id: `stu_${Date.now()}`,
      qqId,
      activatedAt: new Date().toISOString(),
      activationCode: trimmed,
      totalQuestions: 0,
      correctAnswers: 0,
      lastActiveAt: new Date().toISOString(),
      streakDays: 0,
    };
    
    students.set(qqId, newStudent);
    saveData();
    
    return '🎉 激活成功！欢迎加入学习教练！\n\n可用命令：\n• /练习 - 开始练习题\n• /进度 - 查看学习进度\n• /帮助 - 显示帮助';
  }
  
  // 答题
  if (/^[A-Da-d]$/.test(trimmed)) {
    const question = currentQuestions.get(qqId);
    if (!question) {
      return '请先发送 /练习 开始答题。';
    }
    
    const answer = trimmed.toUpperCase();
    const isCorrect = answer === question.correctAnswer;
    
    // 更新统计
    const s = students.get(qqId) || {
      id: `stu_${Date.now()}`,
      qqId,
      totalQuestions: 0,
      correctAnswers: 0,
      streakDays: 0,
    };
    s.totalQuestions++;
    if (isCorrect) s.correctAnswers++;
    students.set(qqId, s);
    saveData();
    
    currentQuestions.delete(qqId);
    
    let output = '';
    if (isCorrect) {
      output += '🎉 回答正确！\n\n';
    } else {
      output += '❌ 回答错误。\n\n';
    }
    
    output += `正确答案：${question.correctAnswer}\n`;
    output += `\n📖 解析：\n${question.explanation || '暂无解析'}\n\n`;
    output += `📊 总题数：${s.totalQuestions} | 正确率：${Math.round((s.correctAnswers / s.totalQuestions) * 100)}%\n\n`;
    output += `发送 /练习 继续，或 /错题 复习薄弱点`;
    
    return output;
  }
  
  // 访客默认
  if (!student) {
    return '👋 欢迎使用学习教练！\n\n请输入激活码：\n• COACH-DEMO-001\n• COACH-DEMO-002\n\n没有激活码？联系管理员获取。';
  }
  
  return null;
}

// 主循环
async function main() {
  loadData();
  
  const adminIds = (process.env.COACH_ADMIN_QQ_IDS || '').split(',').filter(Boolean);
  
  console.log('[Coach Sub-agent] 学习教练 Sub-agent 已启动');
  console.log(`[Coach Sub-agent] 管理员: ${adminIds.length} 人`);
  console.log(`[Coach Sub-agent] 学生: ${students.size} 人`);
  
  // 读取 stdin
  process.stdin.setEncoding('utf-8');
  
  for await (const line of require('readline').createInterface({ input: process.stdin })) {
    try {
      const { command, qqId } = JSON.parse(line);
      const result = await handleCommand(command, qqId, adminIds);
      console.log(JSON.stringify({ result }));
    } catch (e) {
      console.log(JSON.stringify({ error: e.message }));
    }
  }
}

main().catch(console.error);
