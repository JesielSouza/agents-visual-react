import { CodingAgent } from './coding-agent.js';
import { WorkAgent } from './work-agent.js';
import { SocialAgent } from './social-agent.js';
import { HRAgent } from './hr-agent.js';
import { QAAgent } from './qa-agent.js';

/**
 * Maps status.json agent IDs to their specialized class.
 * Only agents listed here get an autonomous loop.
 * CEO is handled separately by CEOAgent.
 */
export const AGENT_CLASS_MAP = {
  'coding': CodingAgent,
  'work': WorkAgent,
  'social': SocialAgent,
  'hr': HRAgent,
  'qa-contract-01': QAAgent,
};

/**
 * Default intervals per agent (ms).
 * Can be overridden by AGENT_INTERVAL_MS_OVERRIDE env var per agent.
 */
export const DEFAULT_AGENT_INTERVALS = {
  'coding': 180000,       // 3 minutes
  'work': 300000,         // 5 minutes
  'social': 240000,       // 4 minutes
  'hr': 300000,           // 5 minutes
  'qa-contract-01': 180000, // 3 minutes
};

export function getAgentClass(agentId) {
  return AGENT_CLASS_MAP[agentId] || null;
}
