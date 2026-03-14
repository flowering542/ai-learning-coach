#!/usr/bin/env node
/**
 * Step 3: 精选旧题300题，改造为5选项
 */

import fs from 'fs';

const DATA_DIR = 'data';

// 读取旧题
const oldData = JSON.parse(
  fs.readFileSync(`${DATA_DIR}/questions.json`, 'utf8')
);

console.log('=== Step 3: 精选旧题300题 ===\n');
console.log(`原题库: ${oldData.metadata?.totalQuestions || oldData.questions?.length} 题`);

// 评分函数
function scoreQuestion(q) {
  let score = 0;
  
  // 有详细解析 +3分
  if (q.explanation && q.explanation.length > 100) score += 3;
  else if (q.explanation && q.explanation.length > 50) score += 2;
  else if (q.explanation) score += 1;
  
  // 选项完整 +2分
  if (q.options && q.options.length >= 4) score += 2;
  
  // 有来源 +1分
  if (q.source) score += 1;
  
  // 难度适中 +1分
  if (q.difficulty === 'medium') score += 1;
  
  // 有正确标注 +1分
  if (q.options?.some(o => o.id === q.correctAnswer || o.isCorrect)) score += 1;
  
  return score;
}

// 维度映射（旧科目 → 新维度）
const subjectToDimension = {
  'blood_basic': '基础知识',
  'transfusion_theory': '相关专业知识',
  'blood_test': '专业知识',
  'clinical_transfusion': '专业知识',
  'transfusion_reaction': '专业实践',
  'blood_quality': '专业实践',
  'immunohematology': '专业知识'
};

// 改造为5选项
function transformTo5Options(q) {
  const newQ = {
    id: `old_${q.id}`,
    dimension: subjectToDimension[q.subjectId] || '专业知识',
    content: q.content,
    options: [...q.options],
    explanation: q.explanation || '暂无解析',
    tags: [q.subjectId, q.difficulty].filter(Boolean),
    source: '旧题改造',
    originalId: q.id,
    quality: scoreQuestion(q)
  };
  
  // 标记正确答案
  const correctId = q.correctAnswer;
  newQ.options.forEach(o => {
    o.isCorrect = (o.id === correctId);
  });
  
  // 添加第5个选项（干扰项）
  if (newQ.options.length === 4) {
    const wrongOptions = newQ.options.filter(o => !o.isCorrect);
    const randomWrong = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
    
    newQ.options.push({
      id: 'E',
      text: `其他（${randomWrong.text.substring(0, 20)}...的变体）`,
      isCorrect: false
    });
  }
  
  return newQ;
}

// 按维度分组精选
const dimensions = ['基础知识', '相关专业知识', '专业知识', '专业实践'];
const selected = [];

for (const dim of dimensions) {
  // 找出属于该维度的题目
  const dimQuestions = oldData.questions
    .filter(q => subjectToDimension[q.subjectId] === dim)
    .map(q => ({...q, score: scoreQuestion(q)}))
    .sort((a, b) => b.score - a.score)
    .slice(0, 75); // 每维度75题，共300题
  
  // 改造
  const transformed = dimQuestions.map(q => transformTo5Options(q));
  
  selected.push(...transformed);
  console.log(`${dim}: 精选 ${transformed.length} 题 (平均质量分: ${(transformed.reduce((s,q)=>s+q.quality,0)/transformed.length).toFixed(1)})`);
}

// 保存
const output = {
  metadata: {
    version: '2.0-old',
    totalQuestions: selected.length,
    source: '旧题改造',
    generatedAt: new Date().toISOString()
  },
  questions: selected
};

fs.writeFileSync(
  `${DATA_DIR}/questions-old-300.json`,
  JSON.stringify(output, null, 2)
);

console.log('\n=== Step 3 完成! ===');
console.log(`精选旧题: ${selected.length} 题`);
console.log('文件: data/questions-old-300.json');
console.log('\n质量分布:');
console.log(`- 高质量(≥6分): ${selected.filter(q=>q.quality>=6).length} 题`);
console.log(`- 中等质量(4-5分): ${selected.filter(q=>q.quality>=4 && q.quality<6).length} 题`);
console.log(`- 一般质量(<4分): ${selected.filter(q=>q.quality<4).length} 题`);
