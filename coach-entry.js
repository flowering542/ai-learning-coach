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
  const userData = loadUserData(userId);
  const isWrongReviewMode = userData?.currentMode === 'wrong_review';
  const isAssessmentMode = userData?.assessment?.status === 'in_progress';

  // 分科模拟考试相关命令（放在最前面，避免被其他命令拦截）
  const isSubjectExamCommand = command?.startsWith('/模拟考试-分科') || command?.startsWith('/exam-subject') ||
                               (command?.startsWith('/考') && /^\/考\d$/.test(command?.trim())) ||
                               command === '/开始考试' || command === '/start-exam';
  
  // 检查是否有进行中的分科考试
  let currentSubjectExam = null;
  for (const subject of ['basic', 'related', 'professional', 'practice']) {
    const exam = userData?.subjectExams?.[subject];
    if (exam?.status === 'in_progress') {
      currentSubjectExam = exam;
      break;
    }
  }
  
  // 如果在分科考试中，所有A-E答题都走分科模块
  const isSubjectExamAnswer = currentSubjectExam && /^[A-Ea-e]$/.test(command?.trim());
  
  if (isSubjectExamCommand || isSubjectExamAnswer) {
    const { subjectExamCommand } = await import('./subject-exam-module.js');
    return subjectExamCommand(command, userId);
  }

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

  // 入学测评相关命令
  const isAssessmentCommand = command?.startsWith('/入学测评') || command?.startsWith('/assessment') ||
                              command?.startsWith('/开始测评') || command?.startsWith('/start');
  const isAssessmentAnswer = isAssessmentMode && /^[A-Ea-e]$/.test(command?.trim());

  if (isAssessmentCommand || isAssessmentAnswer) {
    const { assessmentCommand } = await import('./assessment-module.js');
    return assessmentCommand(command, userId);
  }

  // 每日任务相关命令
  const isDailyTaskCommand = command?.startsWith('/今日任务') || command?.startsWith('/daily') ||
                             command?.startsWith('/完成任务') || command?.startsWith('/complete');

  if (isDailyTaskCommand) {
    const { dailyTaskCommand } = await import('./daily-task-module.js');
    return dailyTaskCommand(command, userId);
  }

  // 成就徽章相关命令
  const isAchievementCommand = command?.startsWith('/徽章') || command?.startsWith('/achievements') || command?.startsWith('/成就');

  if (isAchievementCommand) {
    const { achievementCommand } = await import('./achievement-module.js');
    return achievementCommand(command, userId);
  }

  // 考前疏导相关命令
  const isCounselingCommand = command?.startsWith('/考前疏导') || command?.startsWith('/counseling') ||
                              command?.startsWith('/倒计时') || command?.startsWith('/countdown');

  if (isCounselingCommand) {
    const { counselingCommand } = await import('./counseling-module.js');
    const result = await counselingCommand(command, userId, userData);
    if (result) return result;
  }

  // 检测焦虑关键词（在练习模式外）
  if (!isExamInProgress && !isWrongReviewMode && !isAssessmentMode) {
    const { detectAnxiety, counselingCommand } = await import('./counseling-module.js');
    if (detectAnxiety(command)) {
      return counselingCommand(command, userId);
    }
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
