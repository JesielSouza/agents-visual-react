import fs from 'node:fs/promises';
import { EVENTS_FILE, STATUS_FILE } from '../config.js';

function nowIso() {
  return new Date().toISOString();
}

function titleCase(text) {
  return String(text || '')
    .replace(/[_-]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function inferZone(agent) {
  if (agent.zone) return titleCase(agent.zone);
  if ((agent.team || '').toLowerCase() === 'leadership') return 'Engineering';
  return titleCase(agent.team || 'Engineering');
}

function buildEventId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export class TelemetryService {
  constructor({ llmRouter }) {
    this.llmRouter = llmRouter;
    this.runtimeEvents = [];
    this.agentLLMMap = new Map();
    this.ceoState = {
      id: 'ceo',
      name: 'CEO',
      team: 'Leadership',
      role: 'Chief Executive Officer',
      status: 'running',
      zone: 'Engineering',
      current_task: 'Analyzing team performance',
      llm_provider: null,
      last_activity: nowIso(),
      in_meeting: false,
      autonomous: true,
      tools_used: ['strategy', 'delegation'],
      summary: 'Monitoring the software company.',
    };
  }

  stripBOM(raw) {
    // Node 24 does not auto-strip UTF-8 BOM; do it manually
    return raw.replace(/\uFEFF/g, '');
  }

  async readStatusSnapshot() {
    const raw = await fs.readFile(STATUS_FILE, 'utf8');
    return JSON.parse(this.stripBOM(raw));
  }

  async readEventsSnapshot() {
    const raw = await fs.readFile(EVENTS_FILE, 'utf8');
    return JSON.parse(this.stripBOM(raw));
  }

  resolveAgentLLM(agent) {
    if (agent.id === 'ceo') return this.ceoState.llm_provider || this.llmRouter.primaryLLM?.name || null;
    return this.agentLLMMap.get(agent.id) || this.llmRouter.primaryLLM?.name || null;
  }

  async getAgentsStatus() {
    const snapshot = await this.readStatusSnapshot();
    const rawAgents = snapshot.agents || [];
    let normalized = rawAgents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      team: titleCase(agent.team),
      zone: inferZone(agent),
      status: agent.status,
      current_task: agent.task || agent.current_task || agent.summary || null,
      tools_used: agent.tools_used || [],
      llm_provider: this.resolveAgentLLM(agent),
      last_activity: agent.updatedAt || agent.startedAt || snapshot.updatedAt || nowIso(),
      in_meeting: false,
      summary: agent.summary || null,
      branch: agent.branch || null,
      pr: agent.pr || null,
      autonomous: !!agent.autonomous,
    }));

    // Apply runtime overrides from autonomous agent loops
    if (this._runtimeAgentState) {
      normalized = normalized.map((agent) => {
        const override = this._runtimeAgentState.get(agent.id);
        if (!override) return agent;
        return {
          ...agent,
          status: override.status ?? agent.status,
          zone: override.zone ?? agent.zone,
          current_task: override.current_task ?? agent.current_task,
          summary: override.summary ?? agent.summary,
          llm_provider: override.llm_provider ?? agent.llm_provider,
          last_activity: override.last_activity ?? agent.last_activity,
        };
      });
    }

    const ceoIndex = normalized.findIndex((agent) => agent.id === 'ceo');
    if (ceoIndex !== -1) {
      normalized[ceoIndex] = {
        ...normalized[ceoIndex],
        current_task: this.ceoState.current_task,
        llm_provider: this.resolveAgentLLM(normalized[ceoIndex]),
        last_activity: this.ceoState.last_activity,
        autonomous: true,
      };
      return normalized;
    }

    return [this.ceoState, ...normalized];
  }

  async getTasksStatus() {
    const agents = await this.getAgentsStatus();
    return agents
      .filter((agent) => agent.current_task)
      .map((agent) => ({
        agent_id: agent.id,
        task: agent.current_task,
        status: agent.status,
        llm_provider: agent.llm_provider,
      }));
  }

  recordAgentLLM(agentId, llmUsed) {
    if (!agentId || !llmUsed) return;
    this.agentLLMMap.set(agentId, llmUsed);
  }

  /**
   * Update runtime state for a specific non-CEO agent.
   * Writes to in-memory override map; does NOT persist to status.json.
   */
  updateAgentState(agentId, patch) {
    if (agentId === 'ceo') {
      this.updateCEOState(patch);
      return;
    }
    if (!this._runtimeAgentState) this._runtimeAgentState = new Map();
    const existing = this._runtimeAgentState.get(agentId) || {};
    this._runtimeAgentState.set(agentId, { ...existing, ...patch, updatedAt: nowIso() });
  }

  _getRuntimeOverride(agentId) {
    return this._runtimeAgentState?.get(agentId) || null;
  }

  recordFallbackEvent({ agentId, from, to, reason }) {
    const event = {
      id: buildEventId('evt-fallback'),
      timestamp: nowIso(),
      agentId,
      type: 'llm_fallback',
      title: `LLM fallback: ${from} -> ${to}`,
      details: reason,
      severity: 'warning',
      from_llm: from,
      to_llm: to,
      reason,
    };

    this.runtimeEvents.unshift(event);
    this.runtimeEvents = this.runtimeEvents.slice(0, 200);
    return event;
  }

  recordRuntimeEvent(event) {
    this.runtimeEvents.unshift({
      id: buildEventId('evt-runtime'),
      timestamp: nowIso(),
      severity: 'info',
      ...event,
    });
    this.runtimeEvents = this.runtimeEvents.slice(0, 200);
  }

  async getMergedEvents() {
    const snapshot = await this.readEventsSnapshot();
    return [...(snapshot.events || []), ...this.runtimeEvents]
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  updateCEOState(patch) {
    this.ceoState = {
      ...this.ceoState,
      ...patch,
      llm_provider: patch.llm_provider || this.ceoState.llm_provider || this.llmRouter.primaryLLM?.name || null,
      last_activity: nowIso(),
    };
  }
}
