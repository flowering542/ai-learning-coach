// 学习教练路由 - 主 Agent 调用 Sub-agent
import { sessions_spawn } from './utils/sessions';

const COACH_COMMANDS = [
  '/练习', '/lx',
  '/错题', '/ct',
  '/进度', '/progress',
  '/分析', '/fx',
  '/徽章', '/badge',
  '/打卡', '/checkin',
  '/模式', '/mode',
  '/生成激活码', '/gen',
  '/学生列表', '/students',
  '/统计', '/stats',
  '/切换', '/恢复',
  '/帮助', '/help',
];

const ACTIVATION_CODES = ['COACH-DEMO', 'STUDENT', 'STU-'];

export function isCoachCommand(message: string): boolean {
  const trimmed = message.trim();
  
  // 检查命令前缀
  if (COACH_COMMANDS.some(cmd => trimmed.startsWith(cmd))) {
    return true;
  }
  
  // 检查激活码
  if (ACTIVATION_CODES.some(prefix => trimmed.startsWith(prefix))) {
    return true;
  }
  
  // 检查答题（单字母 A-D）
  if (/^[A-Da-d]$/.test(trimmed)) {
    return true;
  }
  
  return false;
}

export async function routeToCoachAgent(
  message: string,
  qqId: string
): Promise<string | null> {
  if (!isCoachCommand(message)) {
    return null;
  }
  
  try {
    // 调用 Sub-agent
    const result = await sessions_spawn({
      task: JSON.stringify({ command: message, qqId }),
      agentId: 'coach-agent',
      cwd: '~/.openclaw/plugins/coach-agent',
      env: {
        COACH_ADMIN_QQ_IDS: process.env.COACH_ADMIN_QQ_IDS || '1933622876',
        COACH_DATA_DIR: '~/.openclaw/plugins/coach-agent/data',
      },
      timeoutSeconds: 10,
    });
    
    if (result?.includes('SWITCH_TO_STUDENT')) {
      return '✅ 已切换到学生模式，发送 /恢复 可恢复管理员身份。';
    }
    
    if (result?.includes('SWITCH_TO_ADMIN')) {
      return '✅ 已恢复管理员身份。';
    }
    
    return result;
  } catch (e: any) {
    console.error('[Coach Router] Sub-agent 调用失败:', e);
    // 降级到本地处理
    return handleCoachCommandLocal(message, qqId);
  }
}

// 本地降级处理
function handleCoachCommandLocal(message: string, qqId: string): string {
  const trimmed = message.trim();
  
  if (trimmed === '/练习') {
    return `📝 练习题

【血液学基础 | 中等难度】
ABO血型系统中，A型血的抗原是？

A. A抗原
B. B抗原
C. AB抗原
D. 无抗原

💡 请回复 A/B/C/D 选择答案`;
  }
  
  if (trimmed === '/模式') {
    const isAdmin = (process.env.COACH_ADMIN_QQ_IDS || '').includes(qqId);
    if (isAdmin) {
      return '🎯 当前模式：管理员\n\n可用命令：\n• /生成激活码\n• /学生列表\n• /统计\n• /切换';
    }
    return '🎯 当前模式：学生\n\n可用命令：\n• /练习\n• /错题\n• /进度\n• /分析\n• /徽章\n• /打卡';
  }
  
  if (trimmed === '/生成激活码') {
    const code = `STU-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    return `✅ 新激活码：${code}`;
  }
  
  if (trimmed === '/学生列表') {
    return '📋 暂无已激活学生。';
  }
  
  if (trimmed === '/统计') {
    return '📊 统计\n\n👥 学生: 0\n📝 答题: 0\n✅ 平均正确率: 0%';
  }
  
  if (trimmed === '/错题') {
    return '🎉 还没有错题，继续保持！';
  }
  
  if (trimmed === '/进度') {
    return '📊 学习进度\n\n📝 总题数: 0\n✅ 正确率: 0%\n🔥 连续打卡: 0天';
  }
  
  if (trimmed === '/分析') {
    return '📊 薄弱点分析报告\n\n🎉 还没有足够的错题数据，多做几道题再来分析吧！';
  }
  
  if (trimmed === '/徽章') {
    return '🏅 还没有徽章，继续加油！';
  }
  
  if (trimmed === '/打卡') {
    return '🌱 第一天学习，好的开始！';
  }
  
  if (trimmed.startsWith('COACH-DEMO')) {
    return '🎉 激活成功！欢迎加入学习教练！\n\n可用命令：\n• /练习\n• /进度\n• /帮助';
  }
  
  if (/^[A-Da-d]$/.test(trimmed)) {
    return '❌ 回答错误。\n\n正确答案：A\n\n📖 解析：A型血含有A抗原。\n\n发送 /练习 继续。';
  }
  
  return '👋 欢迎使用学习教练！\n\n请输入激活码：\n• COACH-DEMO-001\n• COACH-DEMO-002';
}
