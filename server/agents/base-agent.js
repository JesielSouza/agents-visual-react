import { getJson } from '../lib/http.js';

export /**
 * Parse LLM response text into { reply, action, zone }.
 * Falls back gracefully if model didn't return proper JSON.
 */
function parseLLMResponse(text) {
  const safe = String(text || '').trim();
  // Try to find JSON object in the response
  const match = safe.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      // If model returned JSON, use reply as conversational text, action as internal note
      return {
        reply: parsed.reply || parsed.action || null,
        action: parsed.action || null,
        zone: parsed.zone || null,
      };
    } catch {
      // JSON-like found but invalid — fall through to text parsing
    }
  }
  // No valid JSON — treat entire response as conversational reply
  // Strip any leading "action:" or "reply:" artifacts the model might have written
  const cleaned = safe
    .replace(/^["']?\(action[:\s][^}]{0,200}\)/gi, '')
    .replace(/^["']?\(reply[:\s][^}]{0,200}\)/gi, '')
    .replace(/^action\s*[:=]\s*/gi, '')
    .replace(/^reply\s*[:=]\s*/gi, '')
    .trim();
  return {
    reply: cleaned || safe,
    action: 'respondendo',
    zone: null,
  };
}

function summarizeError(error) {
  if (!error) return 'Unknown error';
  return String(error.message || error);
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

  getSystemPrompt() {
    return `Você é ${this.name}, um agente de ${this.role || this.team} nesta empresa de software.
Função: execute suas responsabilidades de forma autônoma e registre suas ações.`;
  }

  async buildUserPrompt(agents, events, humanCommand = null) {
    const myStatus = agents.find((a) => a.id === this.id);
    const humanBlock = humanCommand
      ? `\n[COMANDO DO HUMANO]: "${humanCommand}"\nResponda a este comando.\n`
      : '';
    return `${humanBlock}Status atual: ${JSON.stringify(myStatus, null, 2)}
Eventos recentes: ${JSON.stringify(events.slice(0, 10), null, 2)}`;
  }

  parseDecision(raw) {
    return parseLLMResponse(raw);
  }

  emitCollaborativeEvents(decision, telemetry) {}

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
      this.lastError = summarizeError(err);
      console.error(`[${this.name}] Cycle ${this.cycleCount} error: ${this.lastError}`);
      return { ok: false, error: this.lastError };
    }
  }

  /**
   * Chat-oriented cycle: returns both a conversational reply and an internal action.
   * Used by the /api/chat endpoint.
   */
  async runWithReply(humanMessage) {
    try {
      const [agents, events] = await Promise.all([
        this.telemetry.getAgentsStatus(),
        this.telemetry.getMergedEvents(),
      ]);

      const myStatus = agents.find((a) => a.id === this.id);
      const collaboratorMap = { 'qa-contract-01': 'qa', 'coding': 'engineering', 'work': 'operations', 'social': 'comms', 'hr': 'people' };
      const collab = collaboratorMap[this.id] || this.team?.toLowerCase();

      const systemPrompt = `Você é ${this.name},${this.role ? ` ${this.role}` : ''} nesta empresa de software.
Você está conversando diretamente com um humano.

REGRAS:
- Responda de forma Conversacional, como se fosse um colega de trabalho. Não seja robótico.
- Mantenha a resposta curta e direta (1-3 parágrafos).
- Não descreva o que você vai fazer — apenas responda ou confirme.
- Se não sabe algo, diga que vai verificar e retornar.
- Para perguntas sobre status, dê contexto útil.

Responda em JSON com dois campos:
{"reply":"sua resposta conversacional aqui","action":"breve descrição da ação interna para observabilidade"}`;

      const userPrompt = `Mensagem do humano: "${humanMessage}"

Seu status atual: ${myStatus?.current_task || 'livre'}
Sua equipe: ${this.team}
${events.length > 0 ? `Últimos eventos:\n${events.slice(0, 5).map((e) => `- ${e.title}`).join('\n')}` : ''}

Responda em JSON com:
- "reply": sua resposta conversacional para o humano
- "action": breve descrição interna (ex: "revisando código", "delegando para QA")`;

      const decision = await this.llmRouter.call([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ], {
        maxTokens: 400,
        preferredLLM: this.llmRouter.primaryLLM?.name,
      });

      const parsed = parseLLMResponse(decision.content);

      // Ensure we always have a conversational reply
      const reply = parsed.reply || `Entendido. Vou verificar isso.`;
      const action = parsed.action || 'respondendo';

      this.telemetry.updateAgentState(this.id, {
        status: 'running',
        current_task: action,
        summary: reply,
        llm_provider: decision.llm_used,
        last_activity: new Date().toISOString(),
      });

      this.telemetry.recordRuntimeEvent({
        agentId: this.id,
        type: 'agent_chat',
        title: `${this.name}: ${action}`,
        details: reply,
        severity: 'info',
        llm_provider: decision.llm_used,
      });

      this.lastError = null;
      return { ok: true, reply, action, llm_used: decision.llm_used };
    } catch (err) {
      this.lastError = summarizeError(err);
      console.error(`[${this.name}] runWithReply error: ${this.lastError}`);
      return { ok: false, error: this.lastError };
    }
  }

  _fallbackReply(action, message) {
    // If JSON parsing failed, generate a polite fallback
    if (!action) return 'Entendido. Deixa eu verificar isso.';
    return `Pode deixar. Vou trabalhar nisso: ${action}.`;
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
