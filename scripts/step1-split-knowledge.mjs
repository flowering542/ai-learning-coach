#!/usr/bin/env node
/**
 * Step 1: 将知识点文件按段落分割
 * 输入: 4个 *_full.txt 文件
 * 输出: 4个 *_points.json 文件
 */

import fs from 'fs';
import path from 'path';

const KNOWLEDGE_DIR = 'data/knowledge-points';
const dimensions = ['基础知识', '相关专业知识', '专业知识', '专业实践'];

function splitKnowledge(content) {
  // 按章节分割 (一、二、三... 或 ###)
  const sections = content
    .split(/\n(?=[一二三四五六七八九十]+、|#{1,3}\s)/)
    .filter(s => s.trim().length > 50); // 过滤太短的
  
  const points = [];
  
  for (const section of sections) {
    // 提取关键句（包含数字、单位、定义的句子）
    const lines = section
      .split('\n')
      .map(l => l.trim())
      .filter(l => {
        // 保留包含以下特征的句子
        const hasNumber = /\d+/.test(l);
        const hasUnit = /[gL%℃ml\/]/.test(l);
        const hasDefinition = /[：:是]/.test(l);
        const hasKeyTerm = /[组成|功能|标准|原则|方法|步骤]/.test(l);
        
        return l.length > 20 && l.length < 200 && 
               (hasNumber || hasUnit || hasDefinition || hasKeyTerm);
      });
    
    points.push(...lines.slice(0, 60)); // 每章最多60个知识点
  }
  
  return [...new Set(points)]; // 去重
}

function main() {
  console.log('=== Step 1: 知识点分割 ===\n');
  
  const stats = [];
  
  for (const dim of dimensions) {
    const inputFile = path.join(KNOWLEDGE_DIR, `${dim}_full.txt`);
    const outputFile = path.join(KNOWLEDGE_DIR, `${dim}_points.json`);
    
    if (!fs.existsSync(inputFile)) {
      console.error(`❌ 文件不存在: ${inputFile}`);
      continue;
    }
    
    const content = fs.readFileSync(inputFile, 'utf8');
    const points = splitKnowledge(content);
    
    fs.writeFileSync(outputFile, JSON.stringify(points, null, 2));
    
    stats.push({
      dimension: dim,
      originalChars: content.length,
      pointsCount: points.length
    });
    
    console.log(`✅ ${dim}`);
    console.log(`   原始字符: ${content.length.toLocaleString()}`);
    console.log(`   知识点数: ${points.length}`);
    console.log('');
  }
  
  // 保存统计
  fs.writeFileSync(
    path.join(KNOWLEDGE_DIR, 'split-stats.json'),
    JSON.stringify(stats, null, 2)
  );
  
  const totalPoints = stats.reduce((sum, s) => sum + s.pointsCount, 0);
  console.log('---');
  console.log(`总计知识点: ${totalPoints} 个`);
  console.log(`预计可生成: ${Math.min(totalPoints, 1000)} 题`);
  console.log('\nStep 1 完成! ✅');
}

main();
