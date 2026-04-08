import { AGENT_CLASS_MAP, DEFAULT_AGENT_INTERVALS } from './agent-registry.js';

function getInterval(agentId) {
  const envKey = `AGENT_INTERVAL_MS_${agentId.toUpperCase().replace(/-/g, '_')}`;
  return Number(process.env[envKey] || DEFAULT_AGENT_INTERVALS[agentId] || 300000);
}

export class AgentManager {
  constructor({ llmRouter, telemetry }) {
    this.llmRouter = llmRouter;
    this.telemetry = telemetry;
    this.agents = new Map(); // id -> agent instance
    this.started = false;
  }

  async bootstrap() {
    const status = await this.telemetry.getAgentsStatus();
    let started = 0;

    for (const agentData of status) {
      // Skip CEO — handled separately by CEOAgent
      if (agentData.id === 'ceo') continue;
      // Skip agents without autonomous flag
      if (agentData.autonomous !== true) continue;

      const AgentClass = AGENT_CLASS_MAP[agentData.id];
      if (!AgentClass) {
        console.log(`[AgentManager] No class registered for ${agentData.id}, skipping`);
        continue;
      }

      const intervalMs = getInterval(agentData.id);
      const agent = new AgentClass({
        id: agentData.id,
        name: agentData.name,
        role: agentData.role,
        team: agentData.team,
        telemetry: this.telemetry,
        llmRouter: this.llmRouter,
        intervalMs,
      });

      this.agents.set(agentData.id, agent);
      console.log(`[AgentManager] Registered ${agentData.name} (${agentData.id}) with interval ${intervalMs}ms`);
      started++;
    }

    console.log(`[AgentManager] Bootstrap complete: ${started} agents registered`);
    return started;
  }

  start() {
    if (this.started) return;
    this.started = true;

    // Stagger agent startup to avoid burst of simultaneous LLM calls
    // Each agent starts with a delay proportional to its position
    const STAGGER_MS = 12000; // 12 seconds between each agent start
    let count = 0;
    let delay = 0;

    for (const [id, agent] of this.agents) {
      setTimeout(() => {
        agent.start();
        console.log(`[AgentManager] Started ${agent.name} (${agent.id})`);
      }, delay);
      delay += STAGGER_MS;
      count++;
    }
    console.log(`[AgentManager] ${count} agents scheduled with ${STAGGER_MS}ms stagger`);
  }

  stop() {
    for (const [id, agent] of this.agents) {
      agent.stop();
    }
    this.agents.clear();
    this.started = false;
    console.log('[AgentManager] All agents stopped');
  }

  getStatus() {
    const list = [];
    for (const [id, agent] of this.agents) {
      list.push(agent.getInfo());
    }
    return {
      total: this.agents.size,
      started: this.started,
      agents: list,
    };
  }

  async triggerAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return { ok: false, error: `Agent ${agentId} not found or not autonomous` };
    }
    return agent.runCycle();
  }

  /**
   * Queue a human command for an agent and trigger an immediate cycle.
   * The agent's next cycle will receive the command as context.
   */
  async sendCommand(agentId, command) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return { ok: false, error: `Agent ${agentId} not found or not autonomous` };
    }

    if (!this._pendingCommands) this._pendingCommands = new Map();
    this._pendingCommands.set(agentId, command);

    const result = await agent.runCycle();
    this._pendingCommands.delete(agentId);

    return {
      ok: true,
      agent_id: agentId,
      command,
      result,
    };
  }

  getPendingCommand(agentId) {
    return this._pendingCommands?.get(agentId) || null;
  }
}
