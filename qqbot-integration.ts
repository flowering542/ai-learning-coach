// QQ Bot 集成 - 将消息转发到 Coach HTTP 服务
// 将此文件放入 OpenClaw 的适当位置

const COACH_API_URL = process.env.COACH_API_URL || 'http://localhost:3000/api/coach';
const COACH_HEALTH_URL = process.env.COACH_HEALTH_URL || 'http://localhost:3000/health';

// Coach 命令列表
const COACH_COMMANDS = [
  '/练习', '/lx', '/错题', '/ct', '/进度', '/jd',
  '/分析', '/fx', '/徽章', '/bj', '/打卡', '/dk',
  '/帮助', '/菜单', '/模式', '/统计', '/学生列表',
  '/生成激活码', '/切换', '/恢复',
  '练习', '做题', '继续', '进度', '错题', '徽章', '打卡',
  '1', '2', '3', '4', '5', '6', '7',
];

// 检查是否为 Coach 命令
export function isCoachCommand(message: string): boolean {
  const trimmed = message.trim();
  
  // 检查命令前缀
  if (COACH_COMMANDS.some(cmd => trimmed === cmd || trimmed.startsWith(cmd))) {
    return true;
  }
  
  // 检查激活码
  if (trimmed.startsWith('COACH-DEMO') || trimmed.startsWith('STUDENT') || trimmed.startsWith('STU-')) {
    return true;
  }
  
  // 检查答题（单字母 A-D）
  if (/^[A-Da-d]$/.test(trimmed)) {
    return true;
  }
  
  return false;
}

// 调用 Coach API
export async function callCoachAPI(command: string, userId: string, platform: string = 'qq'): Promise<string | null> {
  try {
    const response = await fetch(COACH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ command, userId, platform }),
    });
    
    if (!response.ok) {
      console.error('[CoachClient] API 错误:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data.result || data.error || '服务响应异常';
  } catch (error: any) {
    console.error('[CoachClient] 调用失败:', error.message);
    return null;
  }
}

// 检查服务健康
export async function checkCoachHealth(): Promise<boolean> {
  try {
    const response = await fetch(COACH_HEALTH_URL, {
      method: 'GET',
    });
    return response.ok;
  } catch (e) {
    return false;
  }
}

// 处理 QQ Bot 消息
export async function handleQQBotMessage(message: string, qqId: string): Promise<string | null> {
  // 如果不是 Coach 命令，返回 null 让其他处理器处理
  if (!isCoachCommand(message)) {
    return null;
  }
  
  // 检查服务健康
  const isHealthy = await checkCoachHealth();
  if (!isHealthy) {
    return '⚠️ 学习教练服务暂时不可用，请稍后再试。';
  }
  
  // 调用 Coach API
  const result = await callCoachAPI(message, qqId, 'qq');
  return result;
}

console.log('[CoachQQBot] QQ Bot 集成已加载，API:', COACH_API_URL);