// Shared alias list (mirrors chat-router.js — keep in sync)
const ALL_AGENT_IDS = ['coding', 'work', 'social', 'hr', 'qa-contract-01'];

/**
 * Parse LLM response text into { reply, action, zone }.
 * Used by CEO when generating conversational replies.
 */
function parseLLMResponseCEO(text) {
  const safe = String(text || '').trim();
  const match = safe.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      return {
        reply: parsed.reply || parsed.action || null,
        action: parsed.action || null,
        zone: parsed.zone || null,
      };
    } catch { /* fall through */ }
  }
  // No valid JSON — treat as conversational reply directly
  const cleaned = safe
    .replace(/^action\s*[:=]\s*/gi, '')
    .replace(/^reply\s*[:=]\s*/gi, '')
    .trim();
  return {
    reply: cleaned || safe,
    action: 'supervisionando',
    zone: null,
  };
}

function summarizeError(error) {
  if (!error) return 'Unknown error';
  return String(error.message || error);
}

/**
 * CEOAgent — Orchestrator with real task awareness.
 *
 * Improvements over the generic version:
 * - Reads actual task queue from TaskQueue service
 * - Identifies idle agents and unassigned work
 * - Makes concrete delegation decisions
 * - Syncs runtime state to status.json periodically
 * - Maintains decision memory to avoid repetition
 */
export class CEOAgent {
  constructor({ llmRouter, telemetry, taskQueue, agentManager, intervalMs }) {
    this.llmRouter = llmRouter;
    this.telemetry = telemetry;
    this.taskQueue = taskQueue;
    this.agentManager = agentManager;
    this.intervalMs = intervalMs;
    this.timer = null;
    this.cycleCount = 0;
    this.lastError = null;
    this._decisionMemory = []; // last N decisions to avoid repetition
    this._MAX_MEMORY = 8;
    this._lastSyncTime = Date.now();
    this._SYNC_INTERVAL_MS = 5 * 60 * 1000; // sync every 5 min
  }

  _remember(action, target) {
    this._decisionMemory.push({ action, target, at: Date.now() });
    if (this._decisionMemory.length > this._MAX_MEMORY) {
      this._decisionMemory.shift();
    }
  }

  _recently(action, target) {
    return this._decisionMemory.some(
      (d) => d.action === action && d.target === target && Date.now() - d.at < 30 * 60 * 1000
    );
  }

  async _shouldSync() {
    if (Date.now() - this._lastSyncTime > this._SYNC_INTERVAL_MS) {
      this._lastSyncTime = Date.now();
      return true;
    }
    return false;
  }

  async runDecisionCycle() {
    this.cycleCount++;

    try {
      const [agents, events] = await Promise.all([
        this.telemetry.getAgentsStatus(),
        this.telemetry.getMergedEvents(),
      ]);

      const pendingTasks = this.taskQueue.getPending();
      const taskSummary = this.taskQueue.getStatus();
      const idleAgents = agents.filter((a) => a.id !== 'ceo' && a.autonomous && (a.status === 'idle' || a.status === 'done'));
      const busyAgents = agents.filter((a) => a.id !== 'ceo' && a.autonomous && a.status === 'running');
      const recentEvents = events.slice(0, 15);

      // Detect if we fell back to a local (slower/cheaper) LLM
      const isFallback = !!this.llmRouter.lastFallback;
      const isLocal = (this.llmRouter.primaryLLM?.name || '').includes('ollama') || (this.llmRouter.primaryLLM?.name || '').includes('lmstudio');
      const simplify = isFallback || isLocal;

      const prompt = this._buildPrompt({
        agents,
        idleAgents,
        busyAgents,
        pendingTasks,
        taskSummary,
        recentEvents,
        simplify,
        isFallback,
      });

      const decision = await this.llmRouter.call(prompt, {
        maxTokens: simplify ? 500 : 800,
        preferredLLM: this.llmRouter.primaryLLM?.name,
      });

      const parsed = this._parseDecision(decision.content);
      parsed.llm_used = decision.llm_used;

      // Execute the decision
      await this._executeDecision(parsed, { agents, idleAgents, pendingTasks });

      // Sync runtime state periodically
      if (await this._shouldSync()) {
        await this.telemetry.syncRuntimeStateToFile();
        await this.taskQueue.syncToStatusJson();
      }

      // Update CEO state in telemetry
      this.telemetry.updateCEOState({
        status: 'running',
        zone: parsed.zone || 'Engineering',
        current_task: parsed.action || 'Analyzing team',
        summary: parsed.reason || null,
        llm_provider: decision.llm_used,
      });

      this.telemetry.recordAgentLLM('ceo', decision.llm_used);

      this.telemetry.recordRuntimeEvent({
        agentId: 'ceo',
        type: 'ceo_decision',
        title: `CEO: ${parsed.action || 'Strategic review'}`,
        details: parsed.reason || null,
        severity: 'info',
        llm_provider: decision.llm_used,
      });

      if (isFallback && this.llmRouter.lastFallback) {
        this.telemetry.recordFallbackEvent({
          agentId: 'ceo',
          from: this.llmRouter.lastFallback.from,
          to: this.llmRouter.lastFallback.to,
          reason: this.llmRouter.lastFallback.reason,
        });
      }

      this.lastError = null;

      return { ok: true, ...parsed };
    } catch (err) {
      this.lastError = summarizeError(err);
      console.error(`[CEO] Cycle ${this.cycleCount} error: ${this.lastError}`);
      return { ok: false, error: this.lastError };
    }
  }

  _buildPrompt({ agents, idleAgents, busyAgents, pendingTasks, taskSummary, recentEvents, simplify, isFallback }) {
    const systemPrompt = simplify
      ? `Você é o CEO de uma pequena equipe de desenvolvimento de software.
Equilíbrio: tome decisões curtas e práticas. Preferência por ações concretas.
Limite: 3-5 linhas de análise antes de agir.`
      : `Você é o CEO de uma equipe de desenvolvimento de software.
Sua função:
- Manter a equipe produtiva e focada
- Identificar agentes ociosos e atribuir trabalho
- Chamar reuniões quando necessário
- Priorizar tarefas por projeto
- Tomar decisões de alocação de recursos

Seja concreto. Aja, não descreva.`;

    const tasksBlock = pendingTasks.length > 0
      ? `TAREFAS PENDENTES:\n${pendingTasks.map((t) => `  [${t.status}] ${t.title} (${t.agentId ? `↳ ${t.agentId}` : 'sem dono'}) — ${t.project || 'sem projeto'}`).join('\n')}`
      : 'TAREFAS PENDENTES: nenhuma — equipe livre.';

    const idleBlock = idleAgents.length > 0
      ? `AGENTES OCIOSOS: ${idleAgents.map((a) => `${a.id} (${a.team})`).join(', ')}`
      : 'AGENTES OCIOSOS: nenhum.';

    const busyBlock = busyAgents.length > 0
      ? `AGENTES OCUPADOS:\n${busyAgents.map((a) => `  ${a.id}: ${a.current_task || 'trabalhando'} (${a.status})`).join('\n')}`
      : 'AGENTES OCUPADOS: nenhum.';

    const eventsBlock = `ÚLTIMOS EVENTOS (${recentEvents.length}):
${recentEvents.slice(0, 8).map((e) => `  [${e.type}] ${e.title}`).join('\n')}`;

    const taskStats = `STATÍSTICAS: ${taskSummary.total} total | ${taskSummary.pending} pendentes | ${taskSummary.assigned} atribuídas | ${taskSummary.completed} concluídas | ${taskSummary.failed} falhadas`;

    const userPrompt = `CONTEXTO ATUAL:
${tasksBlock}
${idleBlock}
${busyBlock}
${eventsBlock}
${taskStats}
${isFallback ? '\n⚠ MODO REDUZIDO ATIVO — fallback para LLM local.' : ''}

O que você decide? Responda em JSON: {"action":"nome_da_acao","reason":"porquê","zone":"Engineering|Operations|Quality|Communications|People Ops","target":"agent_id ou null","task_id":"task_id ou null"}`;

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
  }

  _parseDecision(raw) {
    const safe = String(raw || '').trim();
    const match = safe.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        return {
          action: parsed.action || 'analyzing',
          reason: parsed.reason || null,
          zone: parsed.zone || 'Engineering',
          target: parsed.target || null,
          task_id: parsed.task_id || null,
        };
      } catch { /* fall through */ }
    }
    return { action: 'analyzing', reason: safe.slice(0, 200), zone: 'Engineering', target: null, task_id: null };
  }

  async _executeDecision(decision, { agents, idleAgents, pendingTasks }) {
    const action = (decision.action || '').toLowerCase();
    const reason = decision.reason;

    this._remember(decision.action, decision.target);

    // delegate_task: assign an idle agent to a pending task
    if (action.includes('delegate') || action.includes('assign') || action.includes('atribuir')) {
      const idleAgent = idleAgents.find((a) => a.id === decision.target) || idleAgents[0];
      const task = pendingTasks.find((t) => t.id === decision.task_id) || pendingTasks[0];

      if (task && idleAgent) {
        await this.taskQueue.assignTask(task.id, idleAgent.id);
        this.telemetry.updateAgentState(idleAgent.id, {
          status: 'running',
          current_task: task.title,
          summary: `Designado pelo CEO: ${task.title}`,
        });
        // Trigger agent immediately
        await this.agentManager.triggerAgent(idleAgent.id);
      } else if (idleAgent) {
        // No pending task — give the idle agent a scanning/review task
        const scanTask = await this.taskQueue.addTask({
          title: `Revisão geral — ${idleAgent.id}`,
          agentId: idleAgent.id,
          project: agents.find((a) => a.id === idleAgent.id)?.project || null,
          description: reason || 'Tarefa de varredura e organização.',
        });
        await this.agentManager.triggerAgent(idleAgent.id);
      }
    }

    // start_task: create and assign a new task
    else if (action.includes('start') || action.includes('criar') || action.includes('begin')) {
      const targetAgent = agents.find((a) => a.id === decision.target);
      const project = targetAgent?.project || 'general';
      const newTask = await this.taskQueue.addTask({
        title: decision.reason || 'Nova tarefa designada pelo CEO',
        agentId: decision.target || null,
        project,
        description: reason,
      });
      if (decision.target) {
        await this.agentManager.triggerAgent(decision.target);
      }
    }

    // call_meeting /sync
    else if (action.includes('meeting') || action.includes('reunião') || action.includes('sync')) {
      this.telemetry.recordRuntimeEvent({
        agentId: 'ceo',
        type: 'meeting_started',
        title: 'CEO convocou reunião',
        details: reason || 'Alinhamento estratégico solicitado.',
        severity: 'warning',
      });
    }

    // review_pr
    else if (action.includes('review') || action.includes('pr') || action.includes('code_review')) {
      const qaAgent = agents.find((a) => a.id === 'qa-contract-01');
      if (qaAgent && !this._recently('review', 'qa-contract-01')) {
        await this.taskQueue.addTask({
          title: `Code review: ${reason || 'PR pendente'}`,
          agentId: 'qa-contract-01',
          project: qaAgent.project || null,
          description: reason,
        });
        await this.agentManager.triggerAgent('qa-contract-01');
      }
    }

    // complete_task / mark_done
    else if (action.includes('complete') || action.includes('done') || action.includes('finish')) {
      if (decision.task_id) {
        await this.taskQueue.completeTask(decision.task_id, reason);
      }
    }

    // analyze / report
    else if (action.includes('analyze') || action.includes('report') || action.includes('review_team')) {
      // CEO taking note — nothing to execute, just logging
    }

    // fallback: if no concrete action detected, trigger the most idle agent
    else {
      const anyIdle = idleAgents[0];
      if (anyIdle && pendingTasks.length > 0) {
        const task = pendingTasks[0];
        await this.taskQueue.assignTask(task.id, anyIdle.id);
        await this.agentManager.triggerAgent(anyIdle.id);
      }
    }
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

  /**
   * Detect which non-CEO agent was mentioned in the command.
   * Returns agentId or null.
   */
  _detectMentionedAgent(command) {
    const lower = command.toLowerCase();
    // Check for agent references
    const mentions = {
      'coding': ['@coding', 'coder', 'engenheiro', 'engenharia', 'dev'],
      'hr': ['@rh', '@hr', 'rh', 'pessoas', 'people'],
      'qa-contract-01': ['@qa', 'qualidade', 'testes', 'testador'],
      'work': ['@work', 'operacoes', 'processo', 'backlog'],
      'social': ['@social', 'comunicacao', 'release'],
    };
    for (const [agentId, keywords] of Object.entries(mentions)) {
      for (const kw of keywords) {
        if (lower.includes(kw)) return agentId;
      }
    }
    return null;
  }

  /**
   * Run a chat-oriented cycle: returns conversational reply + internal action.
   * Used by /api/chat endpoint.
   *
   * If a specific agent was mentioned, delegates to that agent and returns
   * the agent's reply in its persona (not CEO's).
   */
  async runWithCommand(command) {
    try {
      const mentionedAgent = this._detectMentionedAgent(command);

      // If a specific non-CEO agent was mentioned, delegate directly to it
      if (mentionedAgent && this.agentManager) {
        const agent = this.agentManager.agents.get(mentionedAgent);
        if (agent && typeof agent.runWithReply === 'function') {
          const result = await agent.runWithReply(command);
          return {
            ok: true,
            agent_id: 'ceo',
            routed_to: mentionedAgent,
            reply: result.reply || result.action || 'Ok.',
            action: `delegando para ${mentionedAgent}`,
            llm_used: result.llm_used,
          };
        }
      }

      // Otherwise, CEO generates its own conversational reply
      const [agents, events] = await Promise.all([
        this.telemetry.getAgentsStatus(),
        this.telemetry.getMergedEvents(),
      ]);

      const pendingTasks = this.taskQueue.getPending();
      const idleAgents = agents.filter((a) => a.id !== 'ceo' && a.autonomous && (a.status === 'idle' || a.status === 'done'));
      const busyAgents = agents.filter((a) => a.id !== 'ceo' && a.autonomous && a.status === 'running');

      const isFallback = !!this.llmRouter.lastFallback;
      const isLocal = (this.llmRouter.primaryLLM?.name || '').includes('ollama') || (this.llmRouter.primaryLLM?.name || '').includes('lmstudio');
      const simplify = isFallback || isLocal;

      const systemPrompt = simplify
        ? `Você é o CEO de uma pequena equipe de software. Mantenha respostas curtas e práticas.`
        : `Você é o CEO de uma equipe de desenvolvimento. Função: supervisionar, delegar, alocar recursos. Converse de forma direta e prática, como um líder de equipe.`;

      const userPrompt = `Mensagem do humano: "${command}"

Contexto:
- Tarefas pendentes: ${pendingTasks.length}
- Agentes livres: ${idleAgents.map((a) => a.id).join(', ') || 'nenhum'}
${busyAgents.length > 0 ? `- Agentes ocupados:\n${busyAgents.map((a) => `  * ${a.id}: ${a.current_task || 'trabalhando'}`).join('\n')}` : ''}

Responda em JSON com:
- "reply": sua resposta conversacional para o humano (curta, direta, 1-2 parágrafos)
- "action": breve descrição da ação interna que você vai tomar ou decisão`;

      const decision = await this.llmRouter.call([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ], {
        maxTokens: simplify ? 400 : 600,
        preferredLLM: this.llmRouter.primaryLLM?.name,
      });

      const parsed = parseLLMResponseCEO(decision.content);
      const reply = parsed.reply || 'Entendido. Vou analisar a situação.';
      const action = parsed.action || 'supervisionando';

      this.telemetry.updateCEOState({
        status: 'running',
        current_task: action,
        summary: reply,
        llm_provider: decision.llm_used,
      });

      this.telemetry.recordRuntimeEvent({
        agentId: 'ceo',
        type: 'ceo_chat',
        title: `CEO: ${action}`,
        details: reply,
        severity: 'info',
        llm_provider: decision.llm_used,
      });

      this.lastError = null;

      // Record chat event
      this.telemetry.recordChatEvent({
        from: 'human',
        fromName: 'Human',
        to: 'ceo',
        message: command,
        reply,
        type: 'direct',
        agentId: 'ceo',
        llmUsed: decision.llm_used,
      });

      return {
        ok: true,
        agent_id: 'ceo',
        routed_to: null,
        reply,
        action,
        llm_used: decision.llm_used,
      };
    } catch (err) {
      this.lastError = summarizeError(err);
      console.error(`[CEO] runWithCommand error: ${this.lastError}`);
      return { ok: false, error: this.lastError };
    }
  }

  getInfo() {
    return {
      id: 'ceo',
      name: 'CEO',
      cycleCount: this.cycleCount,
      lastError: this.lastError,
      running: this.timer !== null,
      primary_llm: this.llmRouter.primaryLLM?.name || null,
      last_fallback: this.llmRouter.lastFallback || null,
      decision_memory: this._decisionMemory.length,
      task_queue_status: this.taskQueue?.getStatus() || null,
    };
  }
}
