// Daily Task Module - 每日任务推送
// 根据用户等级和进度，推送个性化学习任务

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = process.env.COACH_DATA_DIR || './data';

// 加载所有用户数据
function loadAllUsers() {
  const users = [];
  try {
    const dir = path.join(DATA_DIR, 'students');
    if (!fs.existsSync(dir)) return users;
    
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
        users.push(data);
      } catch (e) {
        console.error('[DailyTask] 加载用户失败:', file);
      }
    }
  } catch (e) {
    console.error('[DailyTask] 加载用户列表失败:', e);
  }
  return users;
}

// 生成每日任务
function generateDailyTask(userData) {
  const today = new Date().toISOString().split('T')[0];
  
  // 检查今天是否已生成任务
  if (userData.dailyTask?.date === today) {
    return userData.dailyTask;
  }
  
  let task = {
    date: today,
    generatedAt: new Date().toISOString(),
    completed: false
  };
  
  // 1. 新用户（未测评）
  if (!userData.assessmentCompleted) {
    task.type = 'new_user';
    task.title = '完成入学测评';
    task.commands = ['/入学测评'];
    task.description = '欢迎新同学！先完成入学测评，制定你的专属学习计划';
    task.priority = 'high';
  }
  // 2. 基础薄弱
  else if (userData.level === '薄弱') {
    task.type = 'weak';
    task.title = '基础巩固';
    task.commands = ['/基础知识', '/错题复习'];
    task.description = '基础是关键，今天从基础知识开始，循序渐进';
    task.target = { basic: 5, wrong: 3 };
  }
  // 3. 基础良好
  else if (userData.level === '良好') {
    task.type = 'good';
    task.title = '综合提升';
    task.commands = ['/练习', '/模拟考试'];
    task.description = '保持手感，今天来10道混合练习题';
    task.target = { practice: 10 };
  }
  // 4. 基础优秀
  else if (userData.level === '优秀') {
    task.type = 'excellent';
    task.title = '冲刺训练';
    task.commands = ['/模拟考试'];
    task.description = '基础扎实！今天做套模拟题检验水平';
    task.target = { exam: 1 };
  }
  // 默认
  else {
    task.type = 'default';
    task.title = '日常练习';
    task.commands = ['/练习'];
    task.description = '今天也要坚持学习哦！';
    task.target = { practice: 10 };
  }
  
  // 保存任务
  userData.dailyTask = task;
  saveUserData(userData.userId, userData);
  
  return task;
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
    console.error('[DailyTask] 保存用户数据失败:', e);
  }
}

// 格式化任务消息
function formatTaskMessage(task, userData) {
  let message = `📅 今日学习任务\n`;
  message += '═'.repeat(25) + '\n\n';
  
  message += `🎯 ${task.title}\n`;
  message += `${task.description}\n\n`;
  
  message += `📋 任务清单:\n`;
  task.commands.forEach((cmd, i) => {
    message += `${i + 1}. 发送 ${cmd}\n`;
  });
  
  // 连续打卡天数
  const streak = userData.streakDays || 0;
  if (streak > 0) {
    message += `\n🔥 连续打卡: ${streak} 天`;
    if (streak >= 7) message += ' 太棒了！';
    else if (streak >= 3) message += ' 继续保持！';
  }
  
  message += '\n\n加油！完成今日任务，离目标更近一步 💪';
  
  return message;
}

// ========== 主函数 ==========

// 生成所有用户的每日任务（cron调用）
export async function generateAllDailyTasks() {
  const users = loadAllUsers();
  const tasks = [];
  
  for (const user of users) {
    const task = generateDailyTask(user);
    tasks.push({
      userId: user.userId,
      task: task
    });
  }
  
  return {
    generated: tasks.length,
    date: new Date().toISOString().split('T')[0],
    tasks: tasks
  };
}

// 获取用户今日任务
export async function getDailyTask(userId) {
  try {
    const filePath = path.join(DATA_DIR, 'students', `${userId}.json`);
    if (!fs.existsSync(filePath)) {
      return { result: '❌ 用户不存在' };
    }
    
    const userData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const task = generateDailyTask(userData);
    
    return { result: formatTaskMessage(task, userData) };
  } catch (e) {
    console.error('[DailyTask] 获取任务失败:', e);
    return { result: '❌ 获取任务失败' };
  }
}

// 标记任务完成
export async function completeDailyTask(userId) {
  try {
    const filePath = path.join(DATA_DIR, 'students', `${userId}.json`);
    if (!fs.existsSync(filePath)) {
      return { result: '❌ 用户不存在' };
    }
    
    const userData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const today = new Date().toISOString().split('T')[0];
    
    // 更新连续打卡
    const lastDate = userData.lastCompletedDate;
    if (lastDate) {
      const last = new Date(lastDate);
      const now = new Date();
      const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        userData.streakDays = (userData.streakDays || 0) + 1;
      } else if (diffDays > 1) {
        userData.streakDays = 1; // 断签，重新计算
      }
    } else {
      userData.streakDays = 1;
    }
    
    userData.lastCompletedDate = today;
    if (userData.dailyTask) {
      userData.dailyTask.completed = true;
      userData.dailyTask.completedAt = new Date().toISOString();
    }
    
    saveUserData(userId, userData);
    
    let message = '🎉 恭喜完成今日任务！\n\n';
    message += `🔥 连续打卡: ${userData.streakDays} 天\n`;
    
    if (userData.streakDays === 3) {
      message += '\n✨ 连续3天打卡！保持这个节奏！';
    } else if (userData.streakDays === 7) {
      message += '\n🌟 一周坚持！学习已成习惯！';
    } else if (userData.streakDays === 30) {
      message += '\n🏆 月度学霸！距离考试更近一步！';
    }
    
    return { result: message };
  } catch (e) {
    console.error('[DailyTask] 完成任务失败:', e);
    return { result: '❌ 标记完成失败' };
  }
}

// 命令处理
export async function dailyTaskCommand(command, userId) {
  const trimmed = command.trim();
  
  if (trimmed === '/今日任务' || trimmed === '/daily') {
    return getDailyTask(userId);
  }
  
  if (trimmed === '/完成任务' || trimmed === '/complete') {
    return completeDailyTask(userId);
  }
  
  return { result: '未知命令，发送 /今日任务 查看今日学习任务' };
}

export default dailyTaskCommand;
