// 错题归因分析模块
// 分析错因、针对性推荐、生成薄弱点报告

import {
  getStudentWrongAnswers,
  getStudentAnswers,
  type Student,
} from "./storage.js";

// 错因类型定义
export type ErrorReason =
  | "concept"      // 概念不清
  | "careless"     // 粗心大意
  | "unfamiliar"   // 没见过/没复习到
  | "misread";     // 审题错误

export interface ErrorAnalysis {
  questionId: string;
  wrongCount: number;
  reason?: ErrorReason;
  timestamp: string;
}

export interface WeakPointReport {
  subject: string;
  weakTopics: {
    topic: string;
    wrongCount: number;
    mainReason: ErrorReason;
    suggestion: string;
  }[];
  overallSuggestion: string;
}

// 错因选项（给学生选择）
export const ERROR_REASON_OPTIONS = [
  { id: "concept", label: "💡 概念不清", emoji: "💡", desc: "对知识点理解不够深入" },
  { id: "careless", label: "😅 粗心大意", emoji: "😅", desc: "看错了、选错了" },
  { id: "unfamiliar", label: "📚 没见过", emoji: "📚", desc: "这个知识点没复习到" },
  { id: "misread", label: "👀 审题错误", emoji: "👀", desc: "没看清题目要求" },
];

/**
 * 生成错因选择提示
 */
export function generateErrorReasonPrompt(questionContent: string): string {
  let output = `❌ 这道题做错了\n\n`;
  output += `请分析一下是什么原因：\n\n`;
  
  ERROR_REASON_OPTIONS.forEach((opt, i) => {
    output += `${i + 1}. ${opt.label} - ${opt.desc}\n`;
  });
  
  output += `\n💡 回复数字 1-4 选择错因，我会针对性推荐练习`;
  
  return output;
}

/**
 * 解析学生选择的错因
 */
export function parseErrorReason(input: string): ErrorReason | null {
  const map: Record<string, ErrorReason> = {
    "1": "concept",
    "2": "careless",
    "3": "unfamiliar",
    "4": "misread",
    "概念": "concept",
    "粗心": "careless",
    "没见过": "unfamiliar",
    "审题": "misread",
  };
  
  const normalized = input.trim().toLowerCase();
  return map[normalized] || null;
}

/**
 * 根据错因生成针对性建议
 */
export function getSuggestionByReason(reason: ErrorReason): string {
  const suggestions: Record<ErrorReason, string> = {
    concept: "📖 建议：回看教材相关章节，重点理解概念定义。推荐做3道同类基础题巩固。",
    careless: "✏️ 建议：做题时圈画关键词，做完后检查一遍。建议放慢速度，提高准确率。",
    unfamiliar: "📚 建议：这个知识点比较冷门，建议收藏本题，考前重点复习。",
    misread: "👀 建议：审题时划出关键信息，注意题目中的否定词（'不正确'、'除外'等）。",
  };
  
  return suggestions[reason];
}

/**
 * 生成薄弱点分析报告
 */
export function generateWeakPointReport(studentId: string): WeakPointReport {
  const wrongAnswers = getStudentWrongAnswers(studentId);
  
  // 按科目统计
  const subjectStats = new Map<string, {
    wrongCount: number;
    reasons: Record<ErrorReason, number>;
  }>();
  
  // 这里简化处理，实际需要关联题目信息
  // 假设所有错题都属于"输血检验"科目
  const subject = "输血检验";
  
  const conceptCount = wrongAnswers.filter(w => w.reason === "concept").length;
  const carelessCount = wrongAnswers.filter(w => w.reason === "careless").length;
  const unfamiliarCount = wrongAnswers.filter(w => w.reason === "unfamiliar").length;
  const misreadCount = wrongAnswers.filter(w => w.reason === "misread").length;
  
  const totalWrong = wrongAnswers.length;
  
  // 找出主要错因
  const reasonCounts = [
    { reason: "concept" as ErrorReason, count: conceptCount },
    { reason: "careless" as ErrorReason, count: carelessCount },
    { reason: "unfamiliar" as ErrorReason, count: unfamiliarCount },
    { reason: "misread" as ErrorReason, count: misreadCount },
  ].sort((a, b) => b.count - a.count);
  
  const mainReason = reasonCounts[0].reason;
  
  // 生成薄弱主题（简化版）
  const weakTopics = [
    {
      topic: "ABO血型鉴定",
      wrongCount: Math.ceil(totalWrong * 0.3),
      mainReason: mainReason,
      suggestion: getSuggestionByReason(mainReason),
    },
    {
      topic: "交叉配血",
      wrongCount: Math.ceil(totalWrong * 0.2),
      mainReason: mainReason,
      suggestion: getSuggestionByReason(mainReason),
    },
  ].filter(t => t.wrongCount > 0);
  
  // 总体建议
  const overallSuggestions: Record<ErrorReason, string> = {
    concept: "你的主要问题是概念理解，建议系统复习教材，建立知识框架。",
    careless: "你经常粗心犯错，建议养成检查习惯，做题时标记关键词。",
    unfamiliar: "你的知识覆盖面不够广，建议多做真题，扩展知识面。",
    misread: "你经常审题错误，建议放慢速度，仔细读题后再作答。",
  };
  
  return {
    subject,
    weakTopics,
    overallSuggestion: overallSuggestions[mainReason] || "继续加油，查漏补缺！",
  };
}

/**
 * 格式化薄弱点报告
 */
export function formatWeakPointReport(report: WeakPointReport): string {
  let output = `📊 薄弱点分析报告\n`;
  output += `━━━━━━━━━━━━━━━\n\n`;
  
  output += `📚 科目：${report.subject}\n\n`;
  
  if (report.weakTopics.length === 0) {
    output += "🎉 还没有足够的错题数据，多做几道题再来分析吧！\n";
  } else {
    output += `🔍 薄弱知识点：\n\n`;
    
    report.weakTopics.forEach((topic, i) => {
      output += `${i + 1}. ${topic.topic}\n`;
      output += `   错题数：${topic.wrongCount}\n`;
      output += `   主要原因：${getReasonLabel(topic.mainReason)}\n`;
      output += `   ${topic.suggestion}\n\n`;
    });
  }
  
  output += `💡 总体建议：\n${report.overallSuggestion}\n\n`;
  output += `发送 /练习 开始针对性训练`;
  
  return output;
}

/**
 * 获取错因标签
 */
function getReasonLabel(reason: ErrorReason): string {
  const labels: Record<ErrorReason, string> = {
    concept: "💡 概念不清",
    careless: "😅 粗心大意",
    unfamiliar: "📚 没见过",
    misread: "👀 审题错误",
  };
  return labels[reason];
}

/**
 * 根据错因推荐题目难度
 */
export function getRecommendedDifficulty(reason: ErrorReason): "easy" | "medium" | "hard" {
  const difficultyMap: Record<ErrorReason, "easy" | "medium" | "hard"> = {
    concept: "easy",      // 概念不清，推荐简单题巩固基础
    careless: "medium",   // 粗心，推荐中等题练细心
    unfamiliar: "easy",   // 没见过，推荐简单题入门
    misread: "medium",    // 审题错误，推荐中等题练审题
  };
  return difficultyMap[reason];
}

/**
 * 生成针对性练习推荐
 */
export function generatePracticeRecommendation(reason: ErrorReason): string {
  const recommendations: Record<ErrorReason, string> = {
    concept: "🎯 推荐练习：基础概念题（难度：简单）\n重点：理解定义，建立知识框架",
    careless: "🎯 推荐练习：中等难度题\n重点：圈画关键词，做完检查",
    unfamiliar: "🎯 推荐练习：真题分类练习\n重点：扩展知识面，收藏冷门考点",
    misread: "🎯 推荐练习：审题专项训练\n重点：划出否定词，理解题意",
  };
  
  return recommendations[reason];
}
