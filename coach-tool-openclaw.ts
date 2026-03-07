// Coach Tool for OpenClaw
// 让 Main Agent 可以调用 AI Learning Coach 服务

const COACH_API_URL = process.env.COACH_API_URL || 'http://localhost:3000/api/coach';

/**
 * Coach Tool - AI 学习教练
 * 
 * 当用户发送以下命令时调用：
 * - /练习, /错题, /进度, /分析, /徽章, /打卡 - 学习命令
 * - COACH-DEMO-001, STUDENT2024A 等 - 激活码
 * - A, B, C, D - 答题选择
 * - "练习", "做题", "继续", "进度" 等自然语言
 */
export const coachTool = {
  name: "coach",
  description: `AI 学习教练 - 医学职称考试辅导系统

支持的命令：
1. 激活: COACH-DEMO-001, STUDENT2024A, STU-XXXXXX
2. 练习: /练习, /lx, "练习", "做题", "来一题"
3. 错题: /错题, /ct, "错题", "错了哪些"
4. 进度: /进度, /jd, "进度", "成绩", "正确率"
5. 分析: /分析, /fx, "分析", "薄弱点"
6. 徽章: /徽章, /bj, "徽章", "成就"
7. 打卡: /打卡, /dk, "打卡", "签到"
8. 帮助: /帮助, "帮助", "怎么用"
9. 答题: A, B, C, D 或 1, 2, 3, 4
10. 继续: "继续", "下一题", "jt", "xyt"

使用场景：
- 用户想练习医学职称考试题目
- 用户输入了激活码
- 用户想查看学习进度或错题
- 用户在做题时选择答案`,
  parameters: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "用户输入的命令或消息",
      },
      userId: {
        type: "string",
        description: "用户唯一标识（QQ ID 或其他平台 ID）",
      },
      platform: {
        type: "string",
        description: "用户所在平台",
        enum: ["qq", "feishu", "wechat", "other"],
        default: "qq",
      },
    },
    required: ["command", "userId"],
  },
  async execute({ command, userId, platform = "qq" }: { command: string; userId: string; platform?: string }) {
    try {
      const response = await fetch(COACH_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command, userId, platform }),
      });

      if (!response.ok) {
        return {
          error: `Coach 服务响应错误: ${response.status}`,
        };
      }

      const data = await response.json();
      
      if (data.error) {
        return {
          error: data.error,
        };
      }

      return {
        result: data.result,
      };
    } catch (error: any) {
      return {
        error: `调用 Coach 服务失败: ${error.message}`,
      };
    }
  },
};

/**
 * 检查消息是否为 Coach 命令
 * 用于在调用 tool 前快速判断
 */
export function isCoachCommand(message: string): boolean {
  const trimmed = message.trim().toLowerCase();
  
  // 命令前缀
  const commands = [
    '/练习', '/lx', '/错题', '/ct', '/进度', '/jd',
    '/分析', '/fx', '/徽章', '/bj', '/打卡', '/dk',
    '/帮助', '/菜单', '/模式', '/统计', '/学生列表',
    '/生成激活码', '/切换', '/恢复',
    '练习', '做题', '继续', '进度', '错题', '徽章', '打卡',
    '帮助', '怎么', '不会',
  ];
  
  if (commands.some(cmd => trimmed === cmd || trimmed.startsWith(cmd))) {
    return true;
  }
  
  // 激活码
  if (trimmed.startsWith('coach-demo') || trimmed.startsWith('student') || trimmed.startsWith('stu-')) {
    return true;
  }
  
  // 答题
  if (/^[a-d1-4]$/.test(trimmed)) {
    return true;
  }
  
  return false;
}

console.log('[CoachTool] Coach Tool 已加载，API:', COACH_API_URL);