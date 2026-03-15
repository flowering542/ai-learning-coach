#!/usr/bin/env node
/**
 * AI Learning Coach - 直接调用 coachTool
 * 绕过 HTTP 服务，直接调用核心逻辑
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 设置环境变量
process.env.COACH_ADMIN_QQ_IDS = process.env.COACH_ADMIN_QQ_IDS || '1933622876';
process.env.COACH_DATA_DIR = process.env.COACH_DATA_DIR || join(__dirname, '../../ai-learning-coach/data');

// 加载 coachTool（使用智能入口）
const { coachTool } = await import('../../ai-learning-coach/coach-entry.js');

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node coach-direct.js <userId> <command>');
    console.log('Example: node coach-direct.js user_001 "/练习"');
    process.exit(1);
  }
  
  const userId = args[0];
  const command = args[1];
  const platform = 'qq';
  const adminIds = (process.env.COACH_ADMIN_QQ_IDS || '').split(',').filter(Boolean);
  
  try {
    const result = await coachTool(command, userId, platform, adminIds);
    
    // 输出结果（用于 OpenClaw 捕获）
    if (typeof result === 'string') {
      console.log(result);
    } else if (result && typeof result === 'object') {
      console.log(result.result || result.message || result.response || JSON.stringify(result));
    } else {
      console.log(String(result));
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
