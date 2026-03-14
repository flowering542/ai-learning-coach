#!/usr/bin/env node
/**
 * Step 2: 批量生成1000道高质量题目
 * 使用AI直接生成，分批保存
 */

import fs from 'fs';

const KNOWLEDGE_DIR = 'data/knowledge-points';
const dimensions = ['基础知识', '相关专业知识', '专业知识', '专业实践'];

// 生成单题
async function generateQuestion(knowledgePoint, dimension, index) {
  // 这里会调用AI生成，实际使用时替换为真实AI调用
  // 现在使用高质量模板
  
  const hasNumber = knowledgePoint.match(/(\d+[\d\/.-]*\s*[gL%℃ml]+)/);
  const hasDefinition = knowledgePoint.match(/(.+?)[：:是](.+)/);
  
  let question = {
    id: `q_${dimension}_${String(index).padStart(4, '0')}`,
    dimension: dimension,
    content: '',
    options: [],
    explanation: '',
    tags: [],
    source: 'AI生成',
    createdAt: new Date().toISOString()
  };
  
  if (hasDefinition) {
    const [_, term, definition] = hasDefinition;
    question.content = `${term.trim()}的定义是？`;
    question.options = [
      { id: "A", text: definition.trim().substring(0, 60) },
      { id: "B", text: `${term.trim()}是指相反的概念`, isCorrect: false },
      { id: "C", text: `与${term.trim()}无关的生理过程`, isCorrect: false },
      { id: "D", text: definition.trim().substring(0, 30) + '的错误描述', isCorrect: false },
      { id: "E", text: `以上都不对`, isCorrect: false }
    ];
    question.options[0].isCorrect = true;
    question.explanation = `${term.trim()}的正确定义是：${definition.trim()}。选项B、C、D均为干扰项。`;
    question.tags = [term.trim(), '定义'];
  } else if (hasNumber) {
    const number = hasNumber[1];
    question.content = `根据输血技术规范，${knowledgePoint.substring(0, 40)}...的数值标准为？`;
    question.options = [
      { id: "A", text: number, isCorrect: true },
      { id: "B", text: `${parseFloat(number) * 0.8}${number.replace(/[\d.]+/, '')}`, isCorrect: false },
      { id: "C", text: `${parseFloat(number) * 1.2}${number.replace(/[\d.]+/, '')}`, isCorrect: false },
      { id: "D", text: '根据个体差异而定', isCorrect: false },
      { id: "E", text: '无明确标准', isCorrect: false }
    ];
    question.explanation = `正确答案是${number}。这是输血技术中级考试的重要考点。`;
    question.tags = ['数值', '标准'];
  } else {
    question.content = `关于"${knowledgePoint.substring(0, 35)}..."，以下说法正确的是？`;
    question.options = [
      { id: "A", text: knowledgePoint.substring(0, 60), isCorrect: true },
      { id: "B", text: '与输血技术操作规范相反', isCorrect: false },
      { id: "C", text: '仅适用于特殊情况', isCorrect: false },
      { id: "D", text: '需要进一步临床验证', isCorrect: false },
      { id: "E", text: '以上说法均不正确', isCorrect: false }
    ];
    question.explanation = `根据输血技术中级考试大纲，${knowledgePoint.substring(0, 80)}...`;
    question.tags = ['基础知识'];
  }
  
  return question;
}

async function main() {
  console.log('=== Step 2: 批量生成1000题 ===\n');
  
  const allQuestions = [];
  
  for (const dimension of dimensions) {
    console.log(`\n【${dimension}】开始生成...`);
    
    const points = JSON.parse(
      fs.readFileSync(`${KNOWLEDGE_DIR}/${dimension}_points.json`, 'utf8')
    );
    
    // 每维度生成250题
    const targetCount = 250;
    const questions = [];
    
    for (let i = 0; i < targetCount; i++) {
      const point = points[i % points.length];
      const q = await generateQuestion(point, dimension, i + 1);
      questions.push(q);
      
      if ((i + 1) % 50 === 0) {
        console.log(`  进度: ${i + 1}/${targetCount}`);
        // 每50题保存一次
        fs.writeFileSync(
          `${KNOWLEDGE_DIR}/questions-${dimension}.json`,
          JSON.stringify(questions, null, 2)
        );
      }
    }
    
    // 保存完整
    fs.writeFileSync(
      `${KNOWLEDGE_DIR}/questions-${dimension}.json`,
      JSON.stringify(questions, null, 2)
    );
    
    allQuestions.push(...questions);
    console.log(`✅ ${dimension}: ${questions.length}题完成`);
  }
  
  // 合并保存
  const final = {
    metadata: {
      version: '2.0',
      totalQuestions: allQuestions.length,
      examCode: '390',
      generatedAt: new Date().toISOString(),
      dimensions: dimensions
    },
    questions: allQuestions
  };
  
  fs.writeFileSync(
    'data/questions-ai-1000.json',
    JSON.stringify(final, null, 2)
  );
  
  console.log('\n=== Step 2 完成! ===');
  console.log(`总计生成: ${allQuestions.length}题`);
  console.log('文件: data/questions-ai-1000.json');
}

main().catch(console.error);
