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
  constructor({ llmRouter, openClawBridge = null }) {
    this.llmRouter = llmRouter;
    this.openClawBridge = openClawBridge;
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
      return this.applyExternalAgentStates(normalized);
    }

    return this.applyExternalAgentStates([this.ceoState, ...normalized]);
  }

  applyExternalAgentStates(agents) {
    if (!this.openClawBridge) return agents;

    const sargento = this.openClawBridge.getSargentoStatus();
    const next = [...agents];
    const existingIndex = next.findIndex((agent) => agent.id === sargento.id);

    if (existingIndex !== -1) {
      next[existingIndex] = {
        ...next[existingIndex],
        ...sargento,
      };
      return next;
    }

    next.push(sargento);
    return next;
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

  /**
   * Record a chat message (user -> agent or agent -> user).
   * Creates TWO records per interaction for proper bidirectional traceability:
   * - "incoming": the human's message, targeted at an agent
   * - "outgoing": the agent's reply, responding to that message
   *
   * Both records share `correlationId` so frontend can pair them.
   * Persisted to status.json via sync.
   */
  recordChatEvent({ from, fromName, fromTeam, to, message, reply, type, agentId, llmUsed }) {
    const correlationId = `corr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const incomingEvent = {
      id: buildEventId('evt-chat-in'),
      timestamp: nowIso(),
      correlationId,
      direction: 'incoming',
      from,
      fromName: fromName || 'Human',
      fromTeam: fromTeam || null,
      to,
      message: message || null,
      reply: null,
      llm_used: null,
      type: type || 'direct',
      agentId: agentId || null,
      eventType: 'chat',
    };

    const outgoingEvent = {
      id: buildEventId('evt-chat-out'),
      timestamp: nowIso(),
      correlationId,
      direction: 'outgoing',
      from: to,
      fromName: to ? this._resolveAgentName(to) : null,
      fromTeam: null,
      to: from,
      message: message || null,
      reply: reply || null,
      llm_used: llmUsed || null,
      type: type || 'direct',
      agentId: agentId || null,
      eventType: 'chat',
    };

    this.runtimeEvents.unshift(outgoingEvent, incomingEvent);
    // Keep last 100 chat pairs (200 events) in memory
    const chatEvents = this.runtimeEvents.filter((e) => e.eventType === 'chat').slice(0, 200);
    this.runtimeEvents = [
      ...chatEvents,
      ...this.runtimeEvents.filter((e) => e.eventType !== 'chat'),
    ].slice(0, 200);
    return { incoming: incomingEvent, outgoing: outgoingEvent };
  }

  _resolveAgentName(agentId) {
    const names = {
      ceo: 'CEO',
      coding: 'Coding',
      work: 'Work',
      social: 'Social',
      hr: 'RH',
      sargento: 'SARGENTO',
      'qa-contract-01': 'QA',
    };
    return names[agentId] || agentId;
  }

  /**
   * Record a command execution.
   * Persisted to status.json via sync.
   */
  recordCommandEvent({ agentId, agentName, command, status, result, note, llmUsed }) {
    const event = {
      id: buildEventId('evt-cmd'),
      timestamp: nowIso(),
      agentId,
      agentName,
      command,
      status: status || 'unknown',
      result: result || null,
      note: note || null,
      llm_used: llmUsed || null,
    };
    this.runtimeEvents.unshift({ ...event, eventType: 'command' });
    // Keep last 100 command events in memory
    const cmdEvents = this.runtimeEvents.filter((e) => e.eventType === 'command').slice(0, 100);
    this.runtimeEvents = [
      ...cmdEvents,
      ...this.runtimeEvents.filter((e) => e.eventType !== 'command'),
    ].slice(0, 200);
    return event;
  }

  getChatHistory({ agentId, limit } = {}) {
    const all = this.runtimeEvents
      .filter((e) => e.eventType === 'chat')
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) // newest first
      .slice(0, limit || 50);
    if (agentId) {
      return all.filter((e) => e.agentId === agentId);
    }
    return all;
  }

  getCommandHistory({ agentId, limit } = {}) {
    const all = this.runtimeEvents
      .filter((e) => e.eventType === 'command')
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) // newest first
      .slice(0, limit || 50);
    if (agentId) {
      return all.filter((e) => e.agentId === agentId);
    }
    return all;
  }

  async syncHistoryToFile() {
    try {
      const raw = await fs.readFile(STATUS_FILE, 'utf8');
      const parsed = JSON.parse(this.stripBOM(raw));

      const chatHistory = this.runtimeEvents
        .filter((e) => e.eventType === 'chat')
        .slice(0, 200)
        .map(({ eventType: _eT, ...rest }) => rest);

      const cmdHistory = this.runtimeEvents
        .filter((e) => e.eventType === 'command')
        .slice(0, 200)
        .map(({ eventType: _eT, ...rest }) => rest);

      parsed.chat_history = chatHistory;
      parsed.command_history = cmdHistory;
      parsed.updatedAt = new Date().toISOString();

      await fs.writeFile(STATUS_FILE, JSON.stringify(parsed, null, 2), 'utf8');
    } catch (err) {
      console.error(`[Telemetry] syncHistoryToFile failed: ${err.message}`);
    }
  }

  async getMergedEvents() {
    const snapshot = await this.readEventsSnapshot();
    return [...(snapshot.events || []), ...this.runtimeEvents]
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  /**
   * Persist runtime agent states back to status.json.
   * Called periodically by the CEO orchestrator to avoid losing state on restart.
   */
  async syncRuntimeStateToFile() {
    try {
      const raw = await fs.readFile(STATUS_FILE, 'utf8');
      const parsed = JSON.parse(this.stripBOM(raw));

      parsed.agents = parsed.agents.map((agent) => {
        if (agent.id === 'ceo') {
          return {
            ...agent,
            status: this.ceoState.status,
            current_task: this.ceoState.current_task,
            summary: this.ceoState.summary,
            zone: this.ceoState.zone,
            llm_provider: this.ceoState.llm_provider,
            updatedAt: new Date().toISOString(),
          };
        }
        const runtime = this._runtimeAgentState?.get(agent.id);
        if (!runtime) return agent;
        return {
          ...agent,
          status: runtime.status ?? agent.status,
          task: runtime.current_task ?? agent.task,
          summary: runtime.summary ?? agent.summary,
          updatedAt: runtime.updatedAt ?? agent.updatedAt,
        };
      });

      parsed.updatedAt = new Date().toISOString();
      await fs.writeFile(STATUS_FILE, JSON.stringify(parsed, null, 2), 'utf8');
    } catch (err) {
      console.error(`[Telemetry] syncRuntimeStateToFile failed: ${err.message}`);
    }
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
