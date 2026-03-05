// Coach HTTP 客户端 - 主 Agent 调用
const COACH_API_URL = process.env.COACH_API_URL || 'http://localhost:3000/api/coach';
const COACH_HEALTH_URL = process.env.COACH_HEALTH_URL || 'http://localhost:3000/health';
// 检查服务健康
export async function checkCoachHealth() {
    try {
        const response = await fetch(COACH_HEALTH_URL, {
            method: 'GET',
        });
        return response.ok;
    }
    catch (e) {
        return false;
    }
}
// 调用 Coach API
export async function callCoachAPI(command, userId, platform = 'qq') {
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
        return await response.json();
    }
    catch (error) {
        console.error('[CoachClient] 调用失败:', error.message);
        return null;
    }
}
// 判断是否为 Coach 命令
export function isCoachCommand(message) {
    const coachCommands = [
        '/练习', '/lx', '/错题', '/ct', '/进度', '/jd',
        '/分析', '/fx', '/徽章', '/bj', '/打卡', '/dk',
        '/帮助', '/菜单', '/模式', '/统计', '/学生列表',
        '/生成激活码', '/切换', '/恢复',
        '练习', '做题', '继续', '进度', '错题', '徽章', '打卡',
        '1', '2', '3', '4', '5', '6', '7',
    ];
    const trimmed = message.trim();
    // 检查命令前缀
    if (coachCommands.some(cmd => trimmed === cmd || trimmed.startsWith(cmd))) {
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
console.log('[CoachClient] HTTP 客户端已加载，API:', COACH_API_URL);
