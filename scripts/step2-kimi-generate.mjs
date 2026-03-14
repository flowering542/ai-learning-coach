#!/usr/bin/env node
/**
 * Step 2: 使用Kimi API生成高质量题目
 */

import fs from 'fs';
import https from 'https';

const KNOWLEDGE_DIR = 'data/knowledge-points';
const API_KEY = process.env.KIMI_API_KEY || 'YOUR_API_KEY';
const API_URL = 'https://api.moonshot.cn/v1/chat/completions';

// 调用Kimi API
async function callKimi(prompt) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'kimi-k2.5',
      messages: [
        { role: 'system', content: '你是专业的输血技术中级考试命题专家，只输出JSON格式，不要任何其他文字。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const options = {
      hostname: 'api.moonshot.cn',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': data.length
      },
      timeout: 60000
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          const content = result.choices?.[0]?.message?.content;
          if (content) {
            resolve(JSON.parse(content));
          } else {
            reject(new Error('API返回格式错误'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时'));
    });

    req.write(data);
    req.end();
  });
}

// 生成题目
async function generateQuestion(knowledgePoint, dimension, index) {
  const prompt = `根据以下输血技术中级考试知识点，生成一道高质量选择题。

【知识点】${knowledgePoint}

【要求】
1. 题目要专业、准确，符合输血技术中级考试标准
2. 5个选项：1个正确答案，2个相似干扰项（易混淆），2个明显错误项
3. 干扰项要合理，不能太简单也不能太离谱
4. 解析要详细，说明为什么对、为什么错
5. 输出严格JSON格式

【输出格式】
{
  "content": "题目内容（不要包含'以下'、'关于'等套话）",
  "options": [
    {"id": "A", "text": "选项内容"},
    {"id": "B", "text": "选项内容"},
    {"id": "C", "text": "选项内容", "isCorrect": true},
    {"id": "D", "text": "选项内容"},
    {"id": "E", "text": "选项内容"}
  ],
  "explanation": "详细解析",
  "tags": ["标签1", "标签2"]
}`;

  try {
    const result = await callKimi(prompt);
    result.id = `ai_${dimension}_${String(index).padStart(4, '0')}`;
    result.dimension = dimension;
    result.source = 'Kimi AI';
    result.createdAt = new Date().toISOString();
    result.knowledgePoint = knowledgePoint.substring(0, 100);
    return result;
  } catch (e) {
    console.error(`生成失败: ${e.message}`);
    return null;
  }
}

async function main() {
  console.log('=== Step 2: Kimi API生成题目 ===\n');
  
  // 测试生成5题（先测试API是否正常）
  const dimension = '基础知识';
  const points = JSON.parse(
    fs.readFileSync(`${KNOWLEDGE_DIR}/${dimension}_points.json`, 'utf8')
  ).slice(0, 5);
  
  console.log(`将为【${dimension}】生成 ${points.length} 道测试题\n`);
  
  const questions = [];
  
  for (let i = 0; i < points.length; i++) {
    console.log(`生成第 ${i+1}/${points.length} 题...`);
    const q = await generateQuestion(points[i], dimension, i+1);
    if (q) {
      questions.push(q);
      console.log(`✅ ${q.content.substring(0, 50)}...`);
    } else {
      console.log('❌ 生成失败，跳过');
    }
    
    // 每题间隔2秒，避免API限制
    if (i < points.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  
  // 保存
  fs.writeFileSync(
    `${KNOWLEDGE_DIR}/kimi-generated-test.json`,
    JSON.stringify(questions, null, 2)
  );
  
  console.log('\n=== 测试结果 ===');
  console.log(`成功生成: ${questions.length}/${points.length} 题`);
  
  // 显示示例
  if (questions.length > 0) {
    console.log('\n=== 示例题目 ===');
    const q = questions[0];
    console.log(`题目: ${q.content}`);
    console.log('选项:');
    q.options?.forEach(o => {
      const mark = o.isCorrect ? ' ✅' : '';
      console.log(`  ${o.id}. ${o.text}${mark}`);
    });
    console.log(`\n解析: ${q.explanation?.substring(0, 150)}...`);
  }
  
  console.log('\n测试完成! ✅');
  console.log('如果质量OK，可以开始批量生成1000题');
}

main().catch(console.error);
