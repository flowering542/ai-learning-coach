// Coach Tool - 学习教练功能模块
// 无状态设计，通过 userId 支持多用户
import * as fs from 'fs';
import * as path from 'path';
const DATA_DIR = process.env.COACH_DATA_DIR || './data';
// 用户数据路径
function getUserDataPath(userId) {
    return path.join(DATA_DIR, 'students', `${userId}.json`);
}
// 加载用户数据
function loadUserData(userId) {
    try {
        const filePath = getUserDataPath(userId);
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }
    }
    catch (e) {
        console.error('[CoachTool] 加载用户数据失败:', e);
    }
    return null;
}
// 保存用户数据
function saveUserData(userId, data) {
    try {
        const dir = path.join(DATA_DIR, 'students');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(getUserDataPath(userId), JSON.stringify(data, null, 2));
    }
    catch (e) {
        console.error('[CoachTool] 保存用户数据失败:', e);
    }
}
// 加载题库
function loadQuestionBank() {
    try {
        const dataPath = path.join(DATA_DIR, 'questions.json');
        const data = fs.readFileSync(dataPath, 'utf-8');
        return JSON.parse(data);
    }
    catch (e) {
        console.error('[CoachTool] 题库加载失败:', e);
        return { questions: [] };
    }
}
// 生成激活码
function generateCode() {
    return `STU-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}
// 主处理函数
export async function coachTool(command, userId, platform = 'qq', adminIds = []) {
    const trimmed = command.trim();
    const isAdmin = adminIds.includes(userId);
    const userData = loadUserData(userId);
    // ========== 管理员命令 ==========
    if (isAdmin && trimmed === '/模式') {
        return {
            result: '🎯 当前模式：管理员\n\n可用命令：\n• /生成激活码\n• /学生列表\n• /统计\n• /切换'
        };
    }
    if (isAdmin && trimmed === '/生成激活码') {
        const code = generateCode();
        return {
            result: `✅ 新激活码：${code}\n\n将此码发给学生即可激活。`,
            data: { code }
        };
    }
    if (isAdmin && trimmed === '/学生列表') {
        const studentsDir = path.join(DATA_DIR, 'students');
        if (!fs.existsSync(studentsDir)) {
            return { result: '📋 暂无已激活学生。' };
        }
        const files = fs.readdirSync(studentsDir).filter(f => f.endsWith('.json'));
        if (files.length === 0)
            return { result: '📋 暂无已激活学生。' };
        let list = '📋 学生列表\n\n';
        let i = 1;
        for (const file of files) {
            const s = JSON.parse(fs.readFileSync(path.join(studentsDir, file), 'utf-8'));
            const acc = s.totalQuestions > 0 ? Math.round((s.correctAnswers / s.totalQuestions) * 100) : 0;
            list += `${i}. ID:${s.id?.slice(-6) || file.replace('.json', '').slice(-6)} 正确率:${acc}% 🔥${s.streakDays || 0}天\n`;
            i++;
        }
        return { result: list };
    }
    if (isAdmin && trimmed === '/统计') {
        const studentsDir = path.join(DATA_DIR, 'students');
        let totalStudents = 0, totalQ = 0, totalC = 0;
        if (fs.existsSync(studentsDir)) {
            const files = fs.readdirSync(studentsDir).filter(f => f.endsWith('.json'));
            totalStudents = files.length;
            for (const file of files) {
                const s = JSON.parse(fs.readFileSync(path.join(studentsDir, file), 'utf-8'));
                totalQ += s.totalQuestions || 0;
                totalC += s.correctAnswers || 0;
            }
        }
        const acc = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;
        return {
            result: `📊 统计\n\n👥 学生: ${totalStudents}\n📝 答题: ${totalQ}\n✅ 平均正确率: ${acc}%`
        };
    }
    if (isAdmin && trimmed === '/切换') {
        return { result: '✅ 已切换到学生模式，发送 /恢复 可恢复管理员身份。' };
    }
    // ========== 学生命令 ==========
    if (trimmed === '/练习' || trimmed === '/lx') {
        const bank = loadQuestionBank();
        if (bank.questions.length === 0) {
            return { result: '❌ 题库加载失败' };
        }
        const question = bank.questions[Math.floor(Math.random() * bank.questions.length)];
        // 保存当前题目到用户数据
        const updatedData = userData || {
            id: `stu_${Date.now()}`,
            userId,
            platform,
            totalQuestions: 0,
            correctAnswers: 0,
            streakDays: 0,
        };
        updatedData.currentQuestion = question;
        updatedData.lastActiveAt = new Date().toISOString();
        saveUserData(userId, updatedData);
        let output = `📝 练习题\n\n`;
        output += `【${question.subjectId || '医学检验'} | ${question.difficulty || '中等'}】\n\n`;
        output += `${question.content}\n\n`;
        if (question.options) {
            question.options.forEach((opt) => {
                output += `${opt.id}. ${opt.text}\n`;
            });
        }
        output += `\n💡 请回复 A/B/C/D 选择答案`;
        return { result: output, data: { question } };
    }
    if (trimmed === '/错题' || trimmed === '/ct') {
        const wrongs = userData?.wrongAnswers || [];
        if (wrongs.length === 0)
            return { result: '🎉 还没有错题，继续保持！' };
        return { result: `🔄 错题复习\n\n你有 ${wrongs.length} 道错题\n发送 /练习 开始针对性练习` };
    }
    if (trimmed === '/进度' || trimmed === '/progress') {
        const s = userData || { totalQuestions: 0, correctAnswers: 0, streakDays: 0 };
        const acc = s.totalQuestions > 0 ? Math.round((s.correctAnswers / s.totalQuestions) * 100) : 0;
        return {
            result: `📊 学习进度\n\n📝 总题数: ${s.totalQuestions}\n✅ 正确率: ${acc}%\n🔥 连续打卡: ${s.streakDays}天`
        };
    }
    if (trimmed === '/分析' || trimmed === '/fx') {
        const wrongs = userData?.wrongAnswers || [];
        if (wrongs.length === 0) {
            return {
                result: '📊 薄弱点分析报告\n\n📚 科目：输血检验\n\n🎉 还没有足够的错题数据，多做几道题再来分析吧！\n\n💡 总体建议：\n继续加油，查漏补缺！\n\n发送 /练习 开始针对性训练'
            };
        }
        // 统计错因
        const reasons = {};
        wrongs.forEach((w) => {
            reasons[w.reason] = (reasons[w.reason] || 0) + 1;
        });
        let report = '📊 薄弱点分析报告\n\n📚 科目：输血检验\n\n';
        report += `📝 错题总数：${wrongs.length}\n\n`;
        report += '🎯 错因分布：\n';
        Object.entries(reasons).forEach(([reason, count]) => {
            report += `  • ${reason}：${count}道\n`;
        });
        report += '\n💡 建议：针对薄弱点加强练习\n\n发送 /练习 开始针对性训练';
        return { result: report };
    }
    if (trimmed === '/徽章' || trimmed === '/badge') {
        const badges = [];
        if ((userData?.totalQuestions || 0) >= 10)
            badges.push('🌱 初学者');
        if ((userData?.correctAnswers || 0) >= 10)
            badges.push('🎯 答题能手');
        if ((userData?.streakDays || 0) >= 7)
            badges.push('🔥 连续打卡7天');
        if (badges.length === 0) {
            return { result: '🏅 还没有徽章，继续加油！\n\n💡 提示：答题10道获得🌱初学者徽章' };
        }
        return { result: `🏅 我的徽章\n\n${badges.join('\n')}` };
    }
    if (trimmed === '/打卡' || trimmed === '/checkin') {
        const s = userData || { streakDays: 0 };
        return {
            result: `🌱 第${s.streakDays || 1}天学习，好的开始！\n\n💡 建议：基础还需巩固，建议从简单题开始，理解概念后再做题。`
        };
    }
    if (trimmed === '/恢复') {
        return { result: '✅ 已恢复管理员身份。' };
    }
    // ========== 激活码 ==========
    if (trimmed.startsWith('COACH-DEMO') || trimmed.startsWith('STUDENT') || trimmed.startsWith('STU-')) {
        if (userData) {
            return { result: '❌ 你已经激活过了，直接发送 /练习 开始学习。' };
        }
        const newUser = {
            id: `stu_${Date.now()}`,
            userId,
            platform,
            activatedAt: new Date().toISOString(),
            activationCode: trimmed,
            totalQuestions: 0,
            correctAnswers: 0,
            lastActiveAt: new Date().toISOString(),
            streakDays: 0,
            wrongAnswers: [],
        };
        saveUserData(userId, newUser);
        return {
            result: '🎉 激活成功！欢迎加入学习教练！\n\n可用命令：\n• /练习 - 开始练习题\n• /进度 - 查看学习进度\n• /错题 - 查看错题\n• /分析 - 薄弱点分析\n• /徽章 - 成就徽章\n• /打卡 - 学习打卡'
        };
    }
    // ========== 答题 ==========
    if (/^[A-Da-d]$/.test(trimmed)) {
        if (!userData?.currentQuestion) {
            return { result: '请先发送 /练习 开始答题。' };
        }
        const question = userData.currentQuestion;
        const answer = trimmed.toUpperCase();
        const isCorrect = answer === question.correctAnswer;
        // 更新统计
        userData.totalQuestions++;
        if (isCorrect) {
            userData.correctAnswers++;
        }
        else {
            // 记录错题
            if (!userData.wrongAnswers)
                userData.wrongAnswers = [];
            userData.wrongAnswers.push({
                questionId: question.id,
                question: question.content,
                yourAnswer: answer,
                correctAnswer: question.correctAnswer,
                timestamp: new Date().toISOString(),
            });
        }
        // 清除当前题目
        delete userData.currentQuestion;
        saveUserData(userId, userData);
        let output = '';
        if (isCorrect) {
            output += '🎉 回答正确！\n\n';
        }
        else {
            output += '❌ 回答错误。\n\n';
        }
        output += `正确答案：${question.correctAnswer}\n`;
        output += `\n📖 解析：\n${question.explanation || '暂无解析'}\n\n`;
        output += `📊 总题数：${userData.totalQuestions} | 正确率：${Math.round((userData.correctAnswers / userData.totalQuestions) * 100)}%\n\n`;
        output += `发送 /练习 继续，或 /错题 复习薄弱点`;
        return { result: output };
    }
    // ========== 帮助 ==========
    if (trimmed === '/帮助' || trimmed === '/help') {
        return {
            result: `📖 学习教练帮助\n\n【学生命令】\n• /练习 - 开始练习题\n• /错题 - 复习错题\n• /进度 - 查看学习进度\n• /分析 - 薄弱点分析\n• /徽章 - 成就徽章\n• /打卡 - 学习打卡\n\n【管理员命令】\n• /生成激活码 - 生成新激活码\n• /学生列表 - 查看所有学生\n• /统计 - 查看全局统计\n• /切换 - 切换到学生模式`
        };
    }
    // ========== 访客默认 ==========
    if (!userData) {
        return {
            result: '👋 欢迎使用学习教练！\n\n请输入激活码：\n• COACH-DEMO-001\n• COACH-DEMO-002\n\n没有激活码？联系管理员获取。'
        };
    }
    return { result: null };
}
console.log('[CoachTool] 学习教练 Tool 已加载');
