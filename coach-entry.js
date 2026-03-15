// Coach Tool 智能入口 - 蓝绿部署
// 根据配置自动切换 V1/V2

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = process.env.COACH_DATA_DIR || './data';

// 加载考试数据（用于判断是否有进行中的考试）
function loadExamData(userId) {
  try {
    const filePath = path.join(DATA_DIR, 'exams', `${userId}.json`);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error('[CoachEntry] 加载考试数据失败:', e);
  }
  return null;
}

// 加载用户数据（用于错题复习）
function loadUserData(userId) {
  try {
    const filePath = path.join(DATA_DIR, 'students', `${userId}.json`);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error('[CoachEntry] 加载用户数据失败:', e);
  }
  return null;
}

// 加载版本配置
function loadVersionConfig() {
  try {
    const configPath = path.join(DATA_DIR, '..', 'coach-version.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {
    console.error('[CoachEntry] 加载配置失败:', e);
  }
  return { activeModule: 'v2' };
}

// 动态加载对应版本
async function loadActiveModule() {
  const config = loadVersionConfig();
  const moduleName = config.activeModule || 'v2';
  
  try {
    if (moduleName === 'v2') {
      const module = await import('./coach-tool-v2.js');
      return module.coachToolV2 || module.default;
    } else {
      const module = await import('./coach-tool-v1-backup.js');
      return module.coachTool || module.default;
    }
  } catch (e) {
    console.error(`[CoachEntry] 加载${moduleName}失败:`, e);
    // 降级到V1
    const module = await import('./coach-tool-v1-backup.js');
    return module.coachTool || module.default;
  }
}

// 主入口
export async function coachTool(command, userId, platform, adminIds) {
  const examData = loadExamData(userId);
  const isExamInProgress = examData?.status === 'in_progress';
  
  // 考试相关命令
  const isExamCommand = command?.startsWith('/模拟考试') || command?.startsWith('/exam') || 
                        command?.startsWith('/交卷') || command?.startsWith('/submit') ||
                        (command === '/开始' && isExamInProgress);
  
  // 考试中答题（A-E）
  const isExamAnswer = isExamInProgress && /^[A-Ea-e]$/.test(command?.trim());
  
  if (isExamCommand || isExamAnswer) {
    const { examCommand } = await import('./exam-module.js');
    return examCommand(command, userId);
  }
  
  // 错题复习相关命令
  const isWrongReviewCommand = command?.startsWith('/错题') || command?.startsWith('/wrong');
  const userData = loadUserData(userId);
  const isWrongReviewMode = userData?.currentMode === 'wrong_review';
  const isWrongReviewAnswer = isWrongReviewMode && /^[A-Ea-e]$/.test(command?.trim());
  
  if (isWrongReviewCommand || isWrongReviewAnswer) {
    const { wrongReviewCommand } = await import('./wrong-review-module.js');
    return wrongReviewCommand(command, userId);
  }
  
  // 数据分析相关命令
  const isAnalyticsCommand = command?.startsWith('/数据分析') || command?.startsWith('/analytics') ||
                             command?.startsWith('/趋势') || command?.startsWith('/trend');
  
  if (isAnalyticsCommand) {
    const { analyticsCommand } = await import('./analytics-module.js');
    return analyticsCommand(command, userId);
  }
  
  const activeFn = await loadActiveModule();
  return activeFn(command, userId, platform, adminIds);
}

// 版本信息
export function getVersionInfo() {
  const config = loadVersionConfig();
  return {
    version: config.version,
    activeModule: config.activeModule,
    description: config.modules?.[config.activeModule]?.description
  };
}

// 切换版本（管理员命令）
export function switchVersion(version) {
  const config = loadVersionConfig();
  if (config.modules?.[version]) {
    config.activeModule = version;
    config.switchedAt = new Date().toISOString();
    fs.writeFileSync(
      path.join(DATA_DIR, '..', 'coach-version.json'),
      JSON.stringify(config, null, 2)
    );
    return { success: true, message: `已切换到 ${version}` };
  }
  return { success: false, message: `版本 ${version} 不存在` };
}

export default coachTool;
