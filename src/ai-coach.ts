// AI 学习教练 - 使用 OpenClaw sessions_spawn 调用 kimi-k2.5
// 模拟 Claude 的教育风格：耐心、苏格拉底式提问、引导思考

// 临时模拟实现，实际部署时替换为真实 API 调用
async function sessions_spawn(options: { task: string; model?: string; timeoutSeconds?: number }): Promise<string | null> {
  // 模拟延迟
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 根据任务内容返回模拟回复
  if (options.task.includes("答对了")) {
    return "很好！能解释一下你的思路吗？💡";
  } else if (options.task.includes("答错了")) {
    // 苏格拉底式引导：不直接说错，而是层层提问
    return "让我们一步步分析这道题...\n\n首先，题目问的是『必查项目』，你觉得输血安全最重要的是什么？🤔";
  }
  
  return "让我们继续思考... 💭";
}

export interface AICoachContext {
  studentId: string;
  question: {
    id: string;
    content: string;
    correctAnswer: string;
    explanation: string;
    subject: string;
  };
  studentAnswer: string;
  isCorrect: boolean;
  history: { role: 'user' | 'assistant'; content: string }[];
}

// Claude 风格的系统提示词
const COACH_SYSTEM_PROMPT = `你是一位专业的医学检验学习教练，风格类似于 Claude。

【核心原则】
1. 耐心鼓励：永远保持支持性语气，让学生感到安全
2. 苏格拉底式：通过提问引导学生自己发现答案，不直接告知对错
3. 简洁互动：每次回复不超过3句话，保持对话感
4. 关注情绪：察觉学生的挫败感，及时给予肯定

【对话策略】
- 学生答错时：用3层提问引导发现
  第1层：确认理解 - "这道题问的是什么？"
  第2层：分析选项 - "你觉得这些选项有什么区别？"
  第3层：引导发现 - "如果...会怎样？"
- 学生答对时：不只说"对了"，而是问"能解释一下为什么吗？"
- 引导发现：用"如果...会怎样？""你觉得...和...有什么区别？"
- 及时肯定：看到进步立即表扬，"比上次有进步！"

【约束】
- 每次回复最多3句话
- 不要一次性解释太多
- 保持对话的开放性
- 用中文回复`;

/**
 * 启动 AI 教练对话
 */
export async function startCoachSession(
  context: AICoachContext
): Promise<string> {
  const prompt = buildInitialPrompt(context);
  
  try {
    const response = await sessions_spawn({
      task: prompt,
      model: "kimi/kimi-k2.5",
      timeoutSeconds: 30,
    });
    
    return response || "让我们继续思考这个问题...";
  } catch (e) {
    console.error("[AICoach] 调用失败:", e);
    return fallbackResponse(context);
  }
}

/**
 * 继续 AI 教练对话
 */
export async function continueCoachSession(
  context: AICoachContext,
  studentReply: string
): Promise<string> {
  const prompt = buildContinuationPrompt(context, studentReply);
  
  try {
    const response = await sessions_spawn({
      task: prompt,
      model: "kimi/kimi-k2.5",
      timeoutSeconds: 30,
    });
    
    return response || "很好的思考，让我们继续...";
  } catch (e) {
    console.error("[AICoach] 调用失败:", e);
    return "你的思路很有意思，能再多说说吗？";
  }
}

/**
 * 构建初始提示词
 */
function buildInitialPrompt(context: AICoachContext): string {
  const { question, studentAnswer, isCorrect } = context;
  
  return `${COACH_SYSTEM_PROMPT}

【当前题目】
${question.content}

【正确答案】${question.correctAnswer}
【学生选择】${studentAnswer}
【是否正确】${isCorrect ? "正确" : "错误"}

【你的任务】
作为学习教练，开始与学生的对话。
${isCorrect 
  ? "学生答对了，但不要只说'对了'。请通过提问引导学生解释思路，确认真正理解。"
  : "学生答错了，但不要直接说'错了'。请通过苏格拉底式提问，引导学生自己发现错误。"
}

请给出第一句话，开启对话：`;
}

/**
 * 构建继续对话的提示词
 */
function buildContinuationPrompt(
  context: AICoachContext,
  studentReply: string
): string {
  const history = context.history
    .map(h => `${h.role === 'user' ? '学生' : '教练'}: ${h.content}`)
    .join('\n');
  
  return `${COACH_SYSTEM_PROMPT}

【对话历史】
${history}

【学生最新回复】
${studentReply}

【当前题目】
${context.question.content}
正确答案：${context.question.correctAnswer}

【你的任务】
继续对话，引导学生深入思考。如果学生已经理解，可以温和地揭晓答案并鼓励。

请回复：`;
}

/**
 * 备用回复（API 失败时）
 */
function fallbackResponse(context: AICoachContext): string {
  if (context.isCorrect) {
    const responses = [
      "答对了！能分享一下你是怎么思考的吗？",
      "很好！你是怎么排除其他选项的？",
      "不错！这个知识点掌握得怎么样？",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  } else {
    // 苏格拉底式引导：根据题目内容设计问题
    const question = context.question;
    const subject = question.subject;
    
    // 第一层：确认理解题意
    if (!context.history || context.history.length < 2) {
      return `让我们一步步分析...\n\n这道题问的是「${question.content.substring(0, 30)}...」，\n你觉得关键信息是什么？🔍`;
    }
    
    // 第二层：分析知识点
    if (context.history.length < 4) {
      return `这道题涉及${subject}的知识。\n\n你还记得这个知识点的核心原理吗？\n或者说说你对这个知识点的理解？🤔`;
    }
    
    // 第三层：引导发现正确答案
    return `很好的思考！\n\n让我们看看选项之间的区别...\n你觉得正确答案应该满足什么条件？💡`;
  }
}

/**
 * 生成最终解析（对话结束后）
 */
export function generateFinalExplanation(context: AICoachContext): string {
  return `📖 完整解析

${context.question.explanation}

💡 关键知识点：${context.question.subject}

继续加油！💪`;
}

/**
 * 判断对话是否应该结束
 */
export function shouldEndConversation(
  history: { role: string; content: string }[]
): boolean {
  // 对话超过 5 轮结束
  if (history.length >= 10) return true;
  
  // 学生说"明白了""懂了"结束
  const lastMessage = history[history.length - 1]?.content.toLowerCase() || "";
  const endSignals = ["明白", "懂了", "知道了", "清楚了", "结束", "下一题"];
  if (endSignals.some(s => lastMessage.includes(s))) return true;
  
  return false;
}
