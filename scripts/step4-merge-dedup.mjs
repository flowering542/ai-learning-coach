#!/usr/bin/env node
/**
 * Step 4: 合并去重，生成最终题库
 */

import fs from 'fs';
import { createHash } from 'crypto';

const DATA_DIR = 'data';

console.log('=== Step 4: 合并去重 ===\n');

// 读取AI生成题
const aiData = JSON.parse(
  fs.readFileSync(`${DATA_DIR}/questions-ai-1000.json`, 'utf8')
);
console.log(`AI生成题: ${aiData.questions.length} 题`);

// 读取旧题
const oldData = JSON.parse(
  fs.readFileSync(`${DATA_DIR}/questions-old-300.json`, 'utf8')
);
console.log(`旧题改造: ${oldData.questions.length} 题`);

// 合并
let allQuestions = [...aiData.questions, ...oldData.questions];
console.log(`\n合并前总计: ${allQuestions.length} 题`);

// 计算题目指纹
function getFingerprint(q) {
  const content = (q.content || '').substring(0, 30);
  const options = (q.options || []).map(o => o.text?.substring(0, 15)).join('');
  return createHash('md5').update(content + options).digest('hex');
}

// 计算相似度
function similarity(s1, s2) {
  if (!s1 || !s2) return 0;
  const set1 = new Set(s1.split(''));
  const set2 = new Set(s2.split(''));
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  return intersection.size / Math.max(set1.size, set2.size);
}

// 去重
const unique = [];
const duplicates = [];
const fingerprints = new Set();

for (const q of allQuestions) {
  const fp = getFingerprint(q);
  
  // 严格重复检查 (>95%)
  if (fingerprints.has(fp)) {
    duplicates.push({ q, reason: '完全重复(>95%)', kept: false });
    continue;
  }
  
  // 相似检查 (80-95%)
  let isSimilar = false;
  for (const u of unique) {
    const sim = similarity(q.content, u.content);
    if (sim > 0.85) {
      // 保留质量高的
      const qQuality = q.quality || 3;
      const uQuality = u.quality || 3;
      
      if (qQuality > uQuality) {
        const idx = unique.indexOf(u);
        duplicates.push({ q: u, reason: '被更高质量替换', kept: false });
        unique[idx] = q;
      } else {
        duplicates.push({ q, reason: '相似度>85%', kept: false });
      }
      isSimilar = true;
      break;
    }
  }
  
  if (!isSimilar) {
    fingerprints.add(fp);
    unique.push(q);
  }
}

console.log(`\n去重后: ${unique.length} 题`);
console.log(`重复/相似: ${duplicates.length} 题`);

// 统计各维度
const byDimension = {};
for (const q of unique) {
  const dim = q.dimension || '未分类';
  byDimension[dim] = (byDimension[dim] || 0) + 1;
}

console.log('\n维度分布:');
Object.entries(byDimension).forEach(([dim, count]) => {
  console.log(`  ${dim}: ${count} 题`);
});

// 生成最终题库
const final = {
  metadata: {
    version: '2.0-final',
    totalQuestions: unique.length,
    examCode: '390',
    examName: '输血技术中级职称考试',
    generatedAt: new Date().toISOString(),
    sources: {
      aiGenerated: aiData.questions.length,
      oldTransformed: oldData.questions.length,
      duplicatesRemoved: duplicates.length
    },
    dimensions: Object.keys(byDimension)
  },
  questions: unique
};

fs.writeFileSync(
  `${DATA_DIR}/questions-v2-final.json`,
  JSON.stringify(final, null, 2)
);

fs.writeFileSync(
  `${DATA_DIR}/duplicates-removed.json`,
  JSON.stringify(duplicates, null, 2)
);

console.log('\n=== Step 4 完成! ===');
console.log('最终题库: data/questions-v2-final.json');
console.log('重复记录: data/duplicates-removed.json');
console.log(`\n✅ 总计: ${unique.length} 题高质量题库`);
