#!/usr/bin/env node
/**
 * Step 2: 使用OpenClaw调用Kimi生成题目
 */

import fs from 'fs';
import { execSync } from 'child_process';

const KNOWLEDGE_DIR = 'data/knowledge-points';

function generatePrompt(knowledgePoint) {
  return `你是一位专业的输血技术中级考试命题专家。

请根据以下知识点生成一道高质量的选择题：

【知识点】${knowledgePoint}

【要求】
1. 题目要专业、准确
2. 5个选项：1个正确答案，2个相似干扰项，2个明显错误项
3. 解析要详细
4. 只输出JSON，不要其他文字

【输出格式】
{
  "content": "题目",
  "options": [
    {"id": "A", "text": "..."},
    {"id": "B", "text": "..."},
    {"id": "C", "text": "...", "isCorrect": true},
    {"id": "D", "text": "..."},
    {"id": "E", "text": "..."}
  ],
  "explanation": "..."
}`;
}

async function generateWithOpenClaw(knowledgePoint) {
  const prompt = generatePrompt(knowledgePoint);
  
  try {
    // 使用openclaw CLI调用Kimi
    const result = execSync(
      `echo ${JSON.stringify(prompt)} | openclaw run --model kimi/kimi-k2.5 --quiet`,
      { 
        encoding: 'utf8', 
        timeout: 60000,
        shell: '/bin/bash'
      }
    );
    
    // 提取JSON
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('生成失败:', e.message);
  }
  
  return null;
}

async function main() {
  console.log('=== Step 2: OpenClaw+Kimi生成题目 ===\n');
  
  const dimension = '基础知识';
  const points = JSON.parse(
    fs.readFileSync(`${KNOWLEDGE_DIR}/${dimension}_points.json`, 'utf8')
  ).slice(0, 3); // 先测试3题
  
  console.log(`将为【${dimension}】生成 ${points.length} 道测试题\n`);
  
  const questions = [];
  
  for (let i = 0; i < points.length; i++) {
    console.log(`生成第 ${i+1}/${points.length} 题...`);
    console.log(`知识点: ${points[i].substring(0, 50)}...`);
    
    const q = await generateWithOpenClaw(points[i]);
    if (q) {
      q.id = `kimi_${dimension}_${String(i+1).padStart(4, '0')}`;
      q.dimension = dimension;
      q.source = 'Kimi via OpenClaw';
      q.createdAt = new Date().toISOString();
      questions.push(q);
      console.log(`✅ 成功: ${q.content?.substring(0, 40)}...\n`);
    } else {
      console.log('❌ 失败\n');
    }
    
    // 间隔3秒
    if (i < points.length - 1) {
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  
  // 保存
  fs.writeFileSync(
    `${KNOWLEDGE_DIR}/openclaw-kimi-test.json`,
    JSON.stringify(questions, null, 2)
  );
  
  console.log('=== 结果 ===');
  console.log(`成功: ${questions.length}/${points.length} 题`);
  
  if (questions.length > 0) {
    console.log('\n示例:');
    const q = questions[0];
    console.log(`题目: ${q.content}`);
    q.options?.forEach(o => {
      const mark = o.isCorrect ? ' ✅' : '';
      console.log(`  ${o.id}. ${o.text}${mark}`);
    });
  }
}

main().catch(console.error);
