#!/usr/bin/env node
/**
 * Step 2 Test: 测试生成10题验证质量
 * 使用简单的模板生成方式（不依赖外部AI API）
 */

import fs from 'fs';

const KNOWLEDGE_DIR = 'data/knowledge-points';

// 简单的题目生成模板
function generateQuestion(knowledgePoint, index) {
  // 提取关键信息
  const hasNumber = knowledgePoint.match(/(\d+[\d\/.-]*\s*[gL%℃ml]*)/);
  const hasDefinition = knowledgePoint.match(/(.+)[：:是](.+)/);
  
  if (hasDefinition) {
    const [_, term, definition] = hasDefinition;
    
    // 生成定义类题目
    return {
      content: `以下关于"${term.trim()}"的描述，正确的是？`,
      options: [
        { id: "A", text: definition.trim().substring(0, 50) + (definition.length > 50 ? '...' : '') },
        { id: "B", text: `${term.trim()}与${term.trim()}无关` },
        { id: "C", text: `${term.trim()}仅适用于特定情况`, isCorrect: false },
        { id: "D", text: `以上都不对` },
        { id: "E", text: `${term.trim()}是输血技术中的基本概念` }
      ],
      explanation: `根据知识点：${knowledgePoint.substring(0, 100)}...`,
      answer: "A",
      source: "模板生成",
      knowledgePoint: knowledgePoint.substring(0, 100)
    };
  }
  
  if (hasNumber) {
    const number = hasNumber[1];
    
    // 生成数值类题目
    return {
      content: `根据输血技术规范，${knowledgePoint.substring(0, 40)}...的数值是？`,
      options: [
        { id: "A", text: number },
        { id: "B", text: "根据具体情况而定" },
        { id: "C", text: "无明确标准" },
        { id: "D", text: "以上都不对" },
        { id: "E", text: `${parseInt(number) * 2}（约）` }
      ],
      explanation: `正确答案是${number}。${knowledgePoint.substring(0, 80)}...`,
      answer: "A",
      source: "模板生成",
      knowledgePoint: knowledgePoint.substring(0, 100)
    };
  }
  
  // 通用题目
  return {
    content: `关于"${knowledgePoint.substring(0, 30)}..."，以下说法正确的是？`,
    options: [
      { id: "A", text: knowledgePoint.substring(0, 50) },
      { id: "B", text: "与输血技术无关" },
      { id: "C", text: "仅适用于特殊情况" },
      { id: "D", text: "需要进一步确认" },
      { id: "E", text: "以上说法都不准确" }
    ],
    explanation: `根据输血技术中级考试大纲：${knowledgePoint.substring(0, 100)}...`,
    answer: "A",
    source: "模板生成",
    knowledgePoint: knowledgePoint.substring(0, 100)
  };
}

function main() {
  console.log('=== Step 2 Test: 测试生成10题 ===\n');
  
  // 读取基础知识知识点
  const points = JSON.parse(
    fs.readFileSync(`${KNOWLEDGE_DIR}/基础知识_points.json`, 'utf8')
  ).slice(0, 10);
  
  console.log('测试知识点:');
  points.forEach((p, i) => console.log(`${i+1}. ${p.substring(0, 60)}...`));
  
  const questions = points.map((p, i) => {
    const q = generateQuestion(p, i);
    q.id = `test_${String(i+1).padStart(3, '0')}`;
    q.dimension = '基础知识';
    return q;
  });
  
  // 保存
  fs.writeFileSync(
    `${KNOWLEDGE_DIR}/test-generated-10.json`,
    JSON.stringify(questions, null, 2)
  );
  
  console.log('\n=== 测试结果 ===');
  console.log(`成功生成: ${questions.length}/10 题`);
  
  // 质量检查
  const checks = {
    has5Options: questions.filter(q => q.options?.length === 5).length,
    hasExplanation: questions.filter(q => q.explanation?.length > 20).length,
    hasAnswer: questions.filter(q => q.answer).length
  };
  
  console.log('\n质量检查:');
  console.log(`- 5选项完整: ${checks.has5Options}/${questions.length} (${Math.round(checks.has5Options/questions.length*100)}%)`);
  console.log(`- 有解析: ${checks.hasExplanation}/${questions.length} (${Math.round(checks.hasExplanation/questions.length*100)}%)`);
  console.log(`- 有答案: ${checks.hasAnswer}/${questions.length} (${Math.round(checks.hasAnswer/questions.length*100)}%)`);
  
  // 显示3个示例
  console.log('\n=== 示例题目（前3题）===');
  questions.slice(0, 3).forEach((q, i) => {
    console.log(`\n【题目 ${i+1}】${q.content}`);
    console.log('选项:');
    q.options.forEach(o => {
      const mark = o.id === q.answer ? ' ✅' : '';
      console.log(`  ${o.id}. ${o.text.substring(0, 40)}${o.text.length > 40 ? '...' : ''}${mark}`);
    });
    console.log(`解析: ${q.explanation.substring(0, 80)}...`);
  });
  
  console.log('\n\n说明:');
  console.log('- 当前使用模板生成（质量一般）');
  console.log('- 正式生成建议使用AI API（质量更高）');
  console.log('- 测试文件保存: test-generated-10.json');
  
  console.log('\n测试完成! ✅');
}

main();
