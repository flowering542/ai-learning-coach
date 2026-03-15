// Coach Tool 智能入口 - 蓝绿部署
// 根据配置自动切换 V1/V2

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = process.env.COACH_DATA_DIR || './data';

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
