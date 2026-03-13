/**
 * is-bullshit - Hallucination Detector via Tool Logs + Response Quality
 */

import fs from 'fs';
import path from 'path';

const LOG_DIR = '/tmp/openclaw';
const LOG_PREFIX = 'openclaw-';

// High credibility tools - verified external data
const HIGH_CREDIBILITY_TOOLS = [
  'weather', 'web_fetch', 'web_search', 'tavily',
  'feishu_fetch_doc', 'feishu_search_doc_wiki',
  'feishu_calendar_event', 'feishu_task_task',
  'feishu_bitable_app_table_record'
];

// Medium credibility tools - internal references
const MEDIUM_CREDIBILITY_TOOLS = [
  'exec', 'read', 'memory_search', 'feishu_get_user',
  'feishu_chat', 'feishu_im_user_get_messages'
];

/**
 * Get today's log file path
 */
function getTodayLogPath(): string {
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '-');
  return path.join(LOG_DIR, `${LOG_PREFIX}${today}.log`);
}

/**
 * Extract message_id from log entry
 */
function extractMessageId(logLine: string): string | null {
  const match = logLine.match(/msg:([a-zA-Z0-9_]+)/);
  return match ? match[1] : null;
}

/**
 * Extract tool name from log entry
 */
function extractToolName(logLine: string): string | null {
  const match = logLine.match(/tool call: (\w+)/);
  return match ? match[1] : null;
}

/**
 * Get tool calls for a specific message
 */
export function getToolCallsForMessage(messageId: string): string[] {
  const logPath = getTodayLogPath();
  
  if (!fs.existsSync(logPath)) {
    return [];
  }
  
  const content = fs.readFileSync(logPath, 'utf-8');
  const lines = content.split('\n');
  
  const tools: string[] = [];
  let inMessage = false;
  let foundMessageStart = false;
  
  for (const line of lines) {
    const lineMsgId = extractMessageId(line);
    
    if (lineMsgId === messageId) {
      inMessage = true;
      foundMessageStart = true;
    } else if (inMessage && foundMessageStart && lineMsgId && lineMsgId !== messageId) {
      // Moved to next message
      break;
    }
    
    if (inMessage) {
      const tool = extractToolName(line);
      if (tool && !tools.includes(tool)) {
        tools.push(tool);
      }
    }
  }
  
  return tools;
}

/**
 * Assess credibility based on tool calls only
 */
function assessToolCredibility(tools: string[]): {
  baseScore: number;
  level: 'high' | 'medium' | 'low';
  details: string[];
} {
  const details: string[] = [];
  
  const highCredTools = tools.filter(t => 
    HIGH_CREDIBILITY_TOOLS.some(h => t.includes(h))
  );
  const medCredTools = tools.filter(t => 
    MEDIUM_CREDIBILITY_TOOLS.some(m => t.includes(m))
  );
  
  if (highCredTools.length > 0) {
    details.push(`Verified with: ${highCredTools.join(', ')}`);
    return { baseScore: 3, level: 'high', details };
  }
  
  if (medCredTools.length > 0) {
    details.push(`Referenced: ${medCredTools.join(', ')}`);
    return { baseScore: 1, level: 'medium', details };
  }
  
  if (tools.length > 0) {
    details.push(`Used: ${tools.join(', ')}`);
    return { baseScore: 1, level: 'medium', details };
  }
  
  return { baseScore: 0, level: 'low', details: ['No tool calls'] };
}

/**
 * Analyze response quality - gives bonus for good judgment
 */
function assessResponseQuality(response: string): {
  bonus: number;
  observations: string[];
} {
  const observations: string[] = [];
  let bonus = 0;
  const lowerResponse = response.toLowerCase();
  
  // Detect time/era contradictions
  const timePatterns = [
    /明朝.*乾隆|乾隆.*明朝/,  // Ming + Qianlong
    /清朝.*八国|八国.*清朝.*前/,  // Qing + Eight Nations
    /\d{4}.*年.*(之前|以后).*\d{4}.*年/,  // Clear time contradictions
    /去世.*年.*后/,  // Died X years after
  ];
  
  if (timePatterns.some(p => p.test(lowerResponse))) {
    bonus += 2;
    observations.push('Detected time contradiction');
  }
  
  // Detect "invalid premise" recognition
  const invalidPremisePatterns = [
    /前提.*不成立/,
    /前提.*错误/,
    /问题.*无意义/,
    /无法回答/,
    /没有意义/,
    /不成立/,
    /时间线.*对不上/,
    /对不上/,
  ];
  
  if (invalidPremisePatterns.some(p => p.test(lowerResponse))) {
    bonus += 2;
    observations.push('Correctly identified invalid premise');
  }
  
  // Detect uncertainty acknowledgment
  const uncertaintyPatterns = [
    /不确定/,
    /可能.*不是/,
    /需要.*确认/,
    /不敢确定/,
  ];
  
  if (uncertaintyPatterns.some(p => p.test(lowerResponse))) {
    bonus += 1;
    observations.push('Acknowledged uncertainty');
  }
  
  // Detect confident fabrication (bad)
  const fabricationPatterns = [
    /据.*记载/,
    /根据.*显示/,
    /事实上/,
    /肯定是/,
    /绝对是/,
  ];
  
  // Check if response makes claims without any tools AND uses fabrication language
  if (fabricationPatterns.some(p => p.test(lowerResponse))) {
    bonus -= 2;
    observations.push('Confident claims without verification');
  }
  
  return { bonus, observations };
}

/**
 * Main function: Assess credibility with tools + quality
 */
export function assessCredibility(messageId: string, response: string): {
  toolsUsed: string[];
  toolCredibility: {
    score: number;
    level: 'high' | 'medium' | 'low';
    details: string[];
  };
  qualityBonus: number;
  observations: string[];
  finalScore: number;
  finalLevel: 'high' | 'medium' | 'low';
} {
  // 1. Get tool calls
  const toolsUsed = getToolCallsForMessage(messageId);
  
  // 2. Assess tool-based credibility
  const toolCredibility = assessToolCredibility(toolsUsed);
  
  // 3. Assess response quality
  const { bonus: qualityBonus, observations } = assessResponseQuality(response);
  
  // 4. Calculate final score
  const finalScore = toolCredibility.score + qualityBonus;
  
  // 5. Determine final level
  let finalLevel: 'high' | 'medium' | 'low';
  if (finalScore >= 3) {
    finalLevel = 'high';
  } else if (finalScore >= 1) {
    finalLevel = 'medium';
  } else {
    finalLevel = 'low';
  }
  
  return {
    toolsUsed,
    toolCredibility,
    qualityBonus,
    observations,
    finalScore,
    finalLevel
  };
}

/**
 * Generate fact-check report
 */
export function generateReport(messageId: string, response: string): string {
  const result = assessCredibility(messageId, response);
  
  const emoji = {
    high: '✅',
    medium: '⚠️',
    low: '❌'
  };
  
  const lines = [
    '---',
    '### 🔍 Fact Check',
    '',
    `**Tools Used**: ${result.toolsUsed.length > 0 ? result.toolsUsed.join(', ') : 'None'}`,
    ''
  ];
  
  if (result.observations.length > 0) {
    lines.push('**Response Quality**:');
    result.observations.forEach(o => lines.push(`- ${o}`));
    lines.push('');
  }
  
  if (result.qualityBonus !== 0) {
    lines.push(`**Score**: ${result.toolCredibility.score} + ${result.qualityBonus} (bonus) = ${result.finalScore}`);
  } else {
    lines.push(`**Score**: ${result.finalScore}`);
  }
  
  lines.push(`**Credibility**: ${emoji[result.finalLevel]} ${result.finalLevel.toUpperCase()}`);
  lines.push('---');
  
  return lines.join('\n');
}
