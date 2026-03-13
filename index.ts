import { generateReport, assessCredibility, getToolCallsForMessage } from "./lib";

/**
 * is-bullshit Skill
 * Detects hallucinations by analyzing tool usage logs + response quality
 */

interface FactCheckResult {
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
}

/**
 * Main handler - analyzes tool usage + response quality
 */
export function checkForBullshit(messageId: string, response: string): FactCheckResult {
  return assessCredibility(messageId, response);
}

// Export for manual testing
export { generateReport, assessCredibility, getToolCallsForMessage };

export default { checkForBullshit };
