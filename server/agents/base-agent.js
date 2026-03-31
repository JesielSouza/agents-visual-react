import { getJson } from '../lib/http.js';

export function extractJson(text) {
  const safe = String(text || '').trim();
  const match = safe.match(/\{[\s\S]*\}/);
  if (!match) {
    return { action: 'Observing', reason: String(safe).slice(0, 200), zone: null };
  }
  try {
    return JSON.parse(match[0]);
  } catch {
    return { action: 'Observing', reason: String(safe).slice(0, 200), zone: null };
  }
}

export class BaseAgent {
  constructor({ id, name, role, team, telemetry, llmRouter, intervalMs }) {
    this.id = id;
    this.name = name;
    this.role = role;
    this.team = team;
    this.telemetry = telemetry;
    this.llmRouter = llmRouter;
    this.intervalMs = intervalMs;
    this.timer = null;
    this.cycleCount = 0;
    this.lastError = null;
  }

  // Override in subclass
  getSystemPrompt() {
    return `Você é ${this.name}, um agente de ${this.role || this.team} nesta empresa de software.
Função: execute suas responsabilidades de forma autônoma e registre suas ações.`;
  }

  // Override in subclass — builds the user prompt with current context
  async buildUserPrompt(agents, events, humanCommand = null) {
    const myStatus = agents.find((a) => a.id === this.id);
    const humanBlock = humanCommand
      ? `\n[COMANDO DO HUMANO]: "${humanCommand}"\nResponda a este comando优先.\n`
      : '';
    return `${humanBlock}Status atual: ${JSON.stringify(myStatus, null, 2)}
Eventos recentes: ${JSON.stringify(events.slice(0, 10), null, 2)}`;
  }

  // Override — return extra fields to update in telemetry after decision
  parseDecision( raw) {
    return extractJson(raw);
  }

  // Override — add agent-specific events based on decision
  emitCollaborativeEvents(decision, telemetry) {
    // Subclasses can emit @mentions, delegation, etc.
  }

  async runCycle(humanCommand = null) {
    try {
      this.cycleCount++;
      const [agents, events] = await Promise.all([
        this.telemetry.getAgentsStatus(),
        this.telemetry.getMergedEvents(),
      ]);

      const userPrompt = await this.buildUserPrompt(agents, events, humanCommand);

      const decision = await this.llmRouter.call([
        { role: 'system', content: this.getSystemPrompt() },
        { role: 'user', content: userPrompt },
      ], {
        maxTokens: 600,
        preferredLLM: this.llmRouter.primaryLLM?.name,
      });

      const parsed = this.parseDecision(decision.content);

      this.telemetry.updateAgentState(this.id, {
        status: 'running',
        zone: parsed.zone || this._inferZone(parsed.action),
        current_task: parsed.action || 'Working',
        summary: parsed.reason || null,
        llm_provider: decision.llm_used,
        last_activity: new Date().toISOString(),
      });

      this.telemetry.recordAgentLLM(this.id, decision.llm_used);

      this.telemetry.recordRuntimeEvent({
        agentId: this.id,
        type: 'agent_decision',
        title: `${this.name}: ${parsed.action || 'Observing'}`,
        details: parsed.reason || null,
        severity: 'info',
        llm_provider: decision.llm_used,
      });

      if (this.llmRouter.lastFallback) {
        this.telemetry.recordFallbackEvent({
          agentId: this.id,
          from: this.llmRouter.lastFallback.from,
          to: this.llmRouter.lastFallback.to,
          reason: this.llmRouter.lastFallback.reason,
        });
      }

      this.emitCollaborativeEvents(parsed, this.telemetry);
      this.lastError = null;

      return { ok: true, action: parsed.action, llm_used: decision.llm_used };
    } catch (err) {
      this.lastError = err.message || String(err);
      console.error(`[${this.name}] Cycle ${this.cycleCount} error: ${this.lastError}`);
      return { ok: false, error: this.lastError };
    }
  }

  _inferZone(action) {
    if (!action) return this.team || 'Engineering';
    const a = action.toLowerCase();
    if (a.includes('code') || a.includes('build') || a.includes('implement')) return 'Engineering';
    if (a.includes('test') || a.includes('valid') || a.includes('qa')) return 'Quality';
    if (a.includes('doc') || a.includes('nota') || a.includes('release')) return 'Communications';
    if (a.includes('hire') || a.includes('people') || a.includes('capacity')) return 'People Ops';
    if (a.includes('analis') || a.includes('process') || a.includes('operation')) return 'Operations';
    return this.team || 'Engineering';
  }

  start() {
    if (this.timer) return;
    // Run immediately, then on interval
    this.runCycle().catch((e) => console.error(`[${this.name}] Initial cycle: ${e.message}`));
    this.timer = setInterval(() => {
      this.runCycle().catch((e) => console.error(`[${this.name}] Cycle error: ${e.message}`));
    }, this.intervalMs);
  }

  stop() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  getInfo() {
    return {
      id: this.id,
      name: this.name,
      team: this.team,
      role: this.role,
      intervalMs: this.intervalMs,
      cycleCount: this.cycleCount,
      lastError: this.lastError,
      running: this.timer !== null,
    };
  }
}
