function extractJson(text) {
  const safe = String(text || '').trim();
  const match = safe.match(/\{[\s\S]*\}/);
  if (!match) {
    return {
      action: 'Reviewing team performance',
      reason: safe || 'Model returned non-JSON output.',
      zone: 'Engineering',
    };
  }
  return JSON.parse(match[0]);
}

export class CEOAgent {
  constructor({ llmRouter, telemetry, intervalMs }) {
    this.llmRouter = llmRouter;
    this.telemetry = telemetry;
    this.intervalMs = intervalMs;
    this.timer = null;
  }

  async runDecisionCycle() {
    const agentsData = await this.telemetry.getAgentsStatus();
    const tasksData = await this.telemetry.getTasksStatus();

    const decision = await this.llmRouter.call([
      {
        role: 'system',
        content: `Você é o CEO de uma empresa de software.

Sua função:
- Monitorar métricas dos agentes
- Tomar decisões estratégicas
- Convocar reuniões quando necessário
- Delegar tarefas
- Dar feedback

Analise o status atual e decida a próxima ação.
Responda em JSON: {"action":"...","reason":"...","zone":"..."}`,
      },
      {
        role: 'user',
        content: `Status atual:
- Agentes: ${JSON.stringify(agentsData)}
- Tarefas: ${JSON.stringify(tasksData)}

Qual sua próxima ação?`,
      },
    ], {
      maxTokens: 700,
      preferredLLM: this.llmRouter.primaryLLM?.name,
    });

    const actionData = extractJson(decision.content);

    this.telemetry.updateCEOState({
      status: 'running',
      zone: actionData.zone || 'Engineering',
      current_task: actionData.action || 'Reviewing team performance',
      summary: actionData.reason || 'Strategic decision in progress.',
      llm_provider: decision.llm_used,
    });
    this.telemetry.recordAgentLLM('ceo', decision.llm_used);
    this.telemetry.recordRuntimeEvent({
      agentId: 'ceo',
      type: 'ceo_decision',
      title: `CEO action: ${actionData.action || 'Strategic review'}`,
      details: actionData.reason || null,
      severity: 'info',
      llm_provider: decision.llm_used,
    });

    if (this.llmRouter.lastFallback) {
      this.telemetry.recordFallbackEvent({
        agentId: 'ceo',
        from: this.llmRouter.lastFallback.from,
        to: this.llmRouter.lastFallback.to,
        reason: this.llmRouter.lastFallback.reason,
      });
    }

    if (String(actionData.action || '').toLowerCase().includes('meeting')) {
      this.telemetry.recordRuntimeEvent({
        agentId: 'ceo',
        type: 'meeting_started',
        title: 'CEO called a meeting',
        details: actionData.reason || 'Strategic alignment requested.',
        severity: 'warning',
      });
    }

    return {
      llm_used: decision.llm_used,
      action: actionData.action,
      reason: actionData.reason,
      zone: actionData.zone,
    };
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.runDecisionCycle().catch((error) => {
        console.error(`[CEO] ${error.message}`);
      });
    }, this.intervalMs);
  }

  stop() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }
}
