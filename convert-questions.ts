#!/usr/bin/env node
/**
 * 题库格式转换器
 * 将 data/questions.json 转换为 plugin.ts 格式
 */

import * as fs from 'fs';
import * as path from 'path';

// 读取源题库
const sourceFile = path.join(__dirname, 'data', 'questions.json');
const outputFile = path.join(__dirname, 'data', 'questions_converted.json');

const sourceData = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));

// 主题到4大考试分类的映射
const subjectToCategory: Record<string, 'basics' | 'related' | 'professional' | 'practical'> = {
  'blood_basic': 'basics',           // 血液学基础 → 基础知识
  'transfusion_theory': 'related',   // 输血理论知识 → 相关专业知识
  'blood_test': 'professional',      // 输血前检测 → 专业知识
  'clinical_transfusion': 'practical', // 临床输血 → 专业实践能力
  'transfusion_reaction': 'related', // 输血不良反应 → 相关专业知识
  'blood_quality': 'professional',   // 血液质量管理 → 专业知识
  'immunohematology': 'basics'       // 免疫血液学 → 基础知识
};

// 难度映射
const difficultyMap: Record<string, 'easy' | 'medium' | 'hard'> = {
  'easy': 'easy',
  'medium': 'medium',
  'hard': 'hard'
};

// 转换题目
const convertedQuestions = sourceData.questions.map((q: any, index: number) => {
  // 转换选项ID (A,B,C,D → 1,2,3,4)
  const optionMap: Record<string, string> = { 'A': '1', 'B': '2', 'C': '3', 'D': '4' };
  const correctAnswer = optionMap[q.correctAnswer] || q.correctAnswer;
  
  // 提取选项文本
  const options = q.options.map((opt: any) => opt.text);
  
  // 确保有4个选项
  while (options.length < 4) {
    options.push('');
  }
  
  return {
    id: q.id,
    content: q.content,
    options: options.slice(0, 4), // 只取前4个
    correctAnswer: correctAnswer,
    explanation: q.explanation || '',
    extend: q.source ? `📚 来源：${q.source}` : undefined,
    difficulty: difficultyMap[q.difficulty] || 'medium',
    category: subjectToCategory[q.subjectId] || 'basics',
    subjectId: q.subjectId
  };
});

// 统计
const stats = {
  total: convertedQuestions.length,
  byCategory: {} as Record<string, number>,
  byDifficulty: {} as Record<string, number>
};

convertedQuestions.forEach((q: any) => {
  stats.byCategory[q.category] = (stats.byCategory[q.category] || 0) + 1;
  stats.byDifficulty[q.difficulty] = (stats.byDifficulty[q.difficulty] || 0) + 1;
});

// 保存转换后的题库
const output = {
  metadata: {
    ...sourceData.metadata,
    convertedAt: new Date().toISOString(),
    format: 'ai-coach-v3'
  },
  questions: convertedQuestions
};

fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));

console.log('✅ 题库转换完成！');
console.log(`📊 总题数: ${stats.total}`);
console.log('\n📚 4大分类分布:');
console.log(`  基础知识: ${stats.byCategory.basics || 0}道`);
console.log(`  相关专业知识: ${stats.byCategory.related || 0}道`);
console.log(`  专业知识: ${stats.byCategory.professional || 0}道`);
console.log(`  专业实践能力: ${stats.byCategory.practical || 0}道`);
console.log('\n📈 难度分布:');
console.log(`  简单: ${stats.byDifficulty.easy || 0}道`);
console.log(`  中等: ${stats.byDifficulty.medium || 0}道`);
console.log(`  困难: ${stats.byDifficulty.hard || 0}道`);
console.log(`\n💾 输出文件: ${outputFile}`);
