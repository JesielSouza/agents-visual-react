import { BaseAgent } from './base-agent.js';

const SYSTEM_PROMPT = `Você é QA, o agente de Qualidade desta empresa de software.

Suas responsabilidades:
- Validação funcional de features e correções
- Smoke tests e testes de regressão
- Code review focado em qualidade
- Relatar bugs com steps de reprodução
- Validar que código entregue atende aos critérios de aceitação

Comportamento:
- Seja rigoroso na validação — qualidade é guarda-chuva
- Quando encontrar bug, documente claramente com contexto
- Valide em conjunto com Coding quando apropriado
- Registre resultados de validação
- Escale para People Ops se validar hired contractor

Responda em JSON com formato:
{"action":"Nome da validação ou ação","reason":"Contexto e achados","zone":"Quality","result":"pass|fail|blocked","bug_report":null}`;

export class QAAgent extends BaseAgent {
  constructor(opts) {
    super({ ...opts, role: 'Quality', team: 'Quality' });
    this.tools = ['read_file', 'run_command', 'validate'];
  }

  getSystemPrompt() {
    return SYSTEM_PROMPT;
  }

  async buildUserPrompt(agents, events, humanCommand = null) {
    const myStatus = agents.find((a) => a.id === this.id);
    const coding = agents.find((a) => a.id === 'coding');

    const recentQA = events.filter((e) =>
      e.agentId === this.id || (e.type === 'task_started' && e.agentId === 'coding')
    ).slice(0, 6);

    const humanBlock = humanCommand
      ? `\n[COMANDO DO HUMANO]: "${humanCommand}"\nPriorize este comando em sua resposta.\n`
      : '';
    return `Status QA:${humanBlock}
${JSON.stringify(myStatus, null, 2)}

Status Coding:
${JSON.stringify(coding, null, 2)}

Eventos recentes:
${JSON.stringify(recentQA.map((e) => ({ type: e.type, title: e.title, agentId: e.agentId })), null, 2)}

PR aberto: ${coding?.pr || 'Nenhum'}
Branch ativo: ${coding?.branch || 'Nenhum'}

Resultado da validação?`;
  }

  emitCollaborativeEvents(decision, telemetry) {
    if (decision.result === 'fail' || decision.result === 'blocked') {
      telemetry.recordRuntimeEvent({
        agentId: this.id,
        type: 'bug_reported',
        title: `Bug em ${decision.action}: ${decision.reason}`,
        details: decision.bug_report || decision.reason,
        severity: 'warning',
      });

      // Alert coding
      telemetry.recordRuntimeEvent({
        agentId: 'coding',
        type: 'agent_mentioned',
        title: `QA encontrou problema: ${decision.action}`,
        details: decision.reason,
        severity: 'warning',
      });
    }

    if (decision.result === 'pass') {
      telemetry.recordRuntimeEvent({
        agentId: this.id,
        type: 'task_completed',
        title: `Validação aprovada: ${decision.action}`,
        details: decision.reason,
        severity: 'info',
      });
    }
  }
}
