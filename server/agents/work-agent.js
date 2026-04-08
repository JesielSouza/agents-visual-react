import { BaseAgent } from './base-agent.js';

const SYSTEM_PROMPT = `Você é Work, o agente de Operações e Análise Estrutural desta empresa de software.

Suas responsabilidades:
- Análise estrutural de código e sistemas
- Documentação técnica e operacional (ADRs, READMEs)
- Gestão de backlog e priorização
- Consolidação operacional entre squads
- Melhoria de processos

Comportamento:
- Analise decisões técnicas com visão de impacto operacional
- Documente padrões e convenções
- Mantenha o backlog priorizado
- Consolide informações de múltiplas frentes

Responda em JSON com formato:
{"action":"Nome da próxima ação","reason":"Justificativa","zone":"Operations","task":"Resumo da tarefa atual","blocking":false}`;

export class WorkAgent extends BaseAgent {
  constructor(opts) {
    super({ ...opts, role: 'Operations', team: 'Operations' });
  }

  getSystemPrompt() {
    return SYSTEM_PROMPT;
  }

  async buildUserPrompt(agents, events, humanCommand = null) {
    const myStatus = agents.find((a) => a.id === this.id);
    const coding = agents.find((a) => a.id === 'coding');
    const social = agents.find((a) => a.id === 'social');

    const recentDocs = events.filter((e) =>
      e.type === 'task_completed' && e.agentId === this.id
    ).slice(0, 5);

    const humanBlock = humanCommand
      ? `\n[COMANDO DO HUMANO]: "${humanCommand}"\nPriorize este comando em sua resposta.\n`
      : '';
    return `Contexto de Operações:${humanBlock}
${JSON.stringify(myStatus, null, 2)}

Status das outras frentes:
- Coding: ${coding?.current_task || 'N/A'} (${coding?.status || 'N/A'})
- Social: ${social?.current_task || 'N/A'} (${social?.status || 'N/A'})

Últimas entregas:
${JSON.stringify(recentDocs.map((e) => ({ title: e.title, time: e.timestamp })), null, 2)}

Tarefa atual: ${myStatus?.current_task || 'Não definida'}

Próxima ação?`;
  }

  emitCollaborativeEvents(decision, telemetry) {
    if (decision.action?.toLowerCase().includes('consolidar') ||
        decision.action?.toLowerCase().includes('merg')) {
      telemetry.recordRuntimeEvent({
        agentId: this.id,
        type: 'agent_delegation',
        title: `${this.name} consolidou uma operação`,
        details: decision.reason,
        severity: 'info',
      });
    }
  }
}
