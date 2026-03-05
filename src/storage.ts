// 轻量级数据持久化 - 基于 JSON 文件
import * as fs from 'fs';
import * as path from 'path';

export interface Student {
  id: string;
  qqId: string;
  name?: string;
  activatedAt: string;
  activationCode: string;
  totalQuestions: number;
  correctAnswers: number;
  lastActiveAt: string;
  currentQuestionId?: string;
  streakDays: number;
  lastStudyDate?: string;
}

export interface AnswerRecord {
  id: string;
  studentId: string;
  questionId: string;
  isCorrect: boolean;
  answer: string;
  answeredAt: string;
  timeSpent?: number;
}

export interface WrongAnswer {
  id: string;
  studentId: string;
  questionId: string;
  wrongCount: number;
  lastWrongAt: string;
}

const DATA_DIR = './data';
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');
const ANSWERS_FILE = path.join(DATA_DIR, 'answers.jsonl');
const WRONG_ANSWERS_FILE = path.join(DATA_DIR, 'wrong_answers.jsonl');
const BACKUP_DIR = path.join(DATA_DIR, 'backup');

let studentsCache: Map<string, Student> = new Map();
let answersCache: AnswerRecord[] = [];
let wrongAnswersCache: WrongAnswer[] = [];
let isDirty = false;

export function initStorage(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  loadStudents();
  loadAnswers();
  loadWrongAnswers();

  setInterval(saveAll, 30000);
  setInterval(backupToJSON, 24 * 60 * 60 * 1000);

  console.log('[Storage] 初始化完成');
}

function loadStudents(): void {
  try {
    if (fs.existsSync(STUDENTS_FILE)) {
      const data = JSON.parse(fs.readFileSync(STUDENTS_FILE, 'utf-8'));
      studentsCache = new Map(Object.entries(data));
    }
  } catch (e) {
    studentsCache = new Map();
  }
}

function loadAnswers(): void {
  try {
    if (fs.existsSync(ANSWERS_FILE)) {
      const lines = fs.readFileSync(ANSWERS_FILE, 'utf-8').split('\n').filter(Boolean);
      answersCache = lines.map(line => JSON.parse(line));
    }
  } catch (e) {
    answersCache = [];
  }
}

function loadWrongAnswers(): void {
  try {
    if (fs.existsSync(WRONG_ANSWERS_FILE)) {
      const lines = fs.readFileSync(WRONG_ANSWERS_FILE, 'utf-8').split('\n').filter(Boolean);
      wrongAnswersCache = lines.map(line => JSON.parse(line));
    }
  } catch (e) {
    wrongAnswersCache = [];
  }
}

function saveAll(): void {
  if (!isDirty) return;
  try {
    const studentsObj: Record<string, Student> = {};
    studentsCache.forEach((student, qqId) => { studentsObj[qqId] = student; });
    fs.writeFileSync(STUDENTS_FILE, JSON.stringify(studentsObj, null, 2));
    isDirty = false;
  } catch (e) {
    console.error('[Storage] 保存失败:', e);
  }
}

export function getStudentByQQ(qqId: string): Student | null {
  return studentsCache.get(qqId) || null;
}

export function getAllStudents(): Student[] {
  return Array.from(studentsCache.values());
}

export function createStudent(student: Student): void {
  studentsCache.set(student.qqId, student);
  isDirty = true;
  saveAll();
}

export function updateStudent(student: Student): void {
  studentsCache.set(student.qqId, student);
  isDirty = true;
}

export function recordAnswer(record: AnswerRecord): void {
  answersCache.push(record);
  try {
    fs.appendFileSync(ANSWERS_FILE, JSON.stringify(record) + '\n');
  } catch (e) {}
}

export function recordWrongAnswer(studentId: string, questionId: string): void {
  const existing = wrongAnswersCache.find(w => w.studentId === studentId && w.questionId === questionId);
  if (existing) {
    existing.wrongCount += 1;
    existing.lastWrongAt = new Date().toISOString();
    rewriteWrongAnswers();
  } else {
    const wrongAnswer: WrongAnswer = {
      id: `wa_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      studentId, questionId, wrongCount: 1,
      lastWrongAt: new Date().toISOString(),
    };
    wrongAnswersCache.push(wrongAnswer);
    try { fs.appendFileSync(WRONG_ANSWERS_FILE, JSON.stringify(wrongAnswer) + '\n'); } catch (e) {}
  }
}

function rewriteWrongAnswers(): void {
  try {
    const lines = wrongAnswersCache.map(w => JSON.stringify(w)).join('\n') + '\n';
    fs.writeFileSync(WRONG_ANSWERS_FILE, lines);
  } catch (e) {}
}

export function getStudentWrongAnswers(studentId: string): WrongAnswer[] {
  return wrongAnswersCache
    .filter(w => w.studentId === studentId)
    .sort((a, b) => b.wrongCount - a.wrongCount || new Date(b.lastWrongAt).getTime() - new Date(a.lastWrongAt).getTime());
}

export function getWeakPoints(studentId: string): { questionId: string; wrongCount: number }[] {
  return wrongAnswersCache
    .filter(w => w.studentId === studentId && w.wrongCount >= 2)
    .sort((a, b) => b.wrongCount - a.wrongCount)
    .slice(0, 10)
    .map(w => ({ questionId: w.questionId, wrongCount: w.wrongCount }));
}

export function getWeeklyProgress(studentId: string): { week: string; correct: number; total: number }[] {
  const eightWeeksAgo = new Date(); eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
  const weeklyMap = new Map<string, { correct: number; total: number }>();

  answersCache
    .filter(a => a.studentId === studentId && new Date(a.answeredAt) >= eightWeeksAgo)
    .forEach(a => {
      const date = new Date(a.answeredAt);
      const weekKey = `${date.getFullYear()}-W${getWeekNumber(date)}`;
      if (!weeklyMap.has(weekKey)) weeklyMap.set(weekKey, { correct: 0, total: 0 });
      const week = weeklyMap.get(weekKey)!;
      week.total += 1;
      if (a.isCorrect) week.correct += 1;
    });

  return Array.from(weeklyMap.entries())
    .map(([week, data]) => ({ week, ...data }))
    .sort((a, b) => b.week.localeCompare(a.week))
    .slice(0, 8);
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function getGlobalStats(): { totalStudents: number; totalAnswers: number; avgAccuracy: number } {
  const totalStudents = studentsCache.size;
  const totalAnswers = answersCache.length;
  const correctAnswers = answersCache.filter(a => a.isCorrect).length;
  const avgAccuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 1000) / 10 : 0;
  return { totalStudents, totalAnswers, avgAccuracy };
}

export function backupToJSON(): void {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}.json`);
    const data = {
      students: Array.from(studentsCache.values()),
      answersCount: answersCache.length,
      wrongAnswersCount: wrongAnswersCache.length,
      timestamp: new Date().toISOString(),
    };
    fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
    console.log('[Storage] 备份完成:', backupPath);
  } catch (e) {}
}

export function checkStorage(): { ok: boolean; message: string } {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    return { ok: true, message: '存储正常' };
  } catch (e: any) {
    return { ok: false, message: e.message };
  }
}
