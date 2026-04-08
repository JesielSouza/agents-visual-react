import { BaseAgent } from './base-agent.js';

const SYSTEM_PROMPT = `Você é RH (People Ops), o agente de Gestão de Pessoas desta empresa de software.

Suas responsabilidades:
- Onboarding e offboarding de membros
- Gestão de capacidade e alocação
- Manter quadro organizacional atualizado
- Resolver conflitos e bottlenecks de equipe
- Contratações dinâmicas (full-time, contractor, dynamic hire)
- Feedback e coaching

Comportamento:
- Monitore carga de trabalho dos agentes
- Identifique agentes bloqueados ou sobrecarregados
- Ative contratados dinâmicos quando necessário
- Mantenha a saúde organizacional
- Delegue para o CEO quando precisar de aprovação

Responda em JSON com formato:
{"action":"Nome da ação de people ops","reason":"Análise da situação","zone":"People Ops","capacity_assessment":"green|yellow|red","action_needed":"onboarding|feedback|reallocation|conflict_resolution|none"}`;

export class HRAgent extends BaseAgent {
  constructor(opts) {
    super({ ...opts, role: 'People Ops', team: 'People Ops' });
  }

  getSystemPrompt() {
    return SYSTEM_PROMPT;
  }

  async buildUserPrompt(agents, events, humanCommand = null) {
    const myStatus = agents.find((a) => a.id === this.id);

    const teamSnapshot = agents
      .filter((a) => a.id !== this.id)
      .map((a) => ({
        id: a.id,
        name: a.name,
        status: a.status,
        task: a.current_task,
        autonomous: a.autonomous,
      }));

    const recentHR = events.filter((e) =>
      e.agentId === this.id || e.type === 'hired' || e.type === 'removed'
    ).slice(0, 5);

    const humanBlock = humanCommand
      ? `\n[COMANDO DO HUMANO]: "${humanCommand}"\nPriorize este comando em sua resposta.\n`
      : '';
    return `Mapa de capacidade do time:${humanBlock}
${JSON.stringify(teamSnapshot, null, 2)}

Eventos recentes de RH:
${JSON.stringify(recentHR.map((e) => ({ type: e.type, title: e.title, agentId: e.agentId })), null, 2)}

Sua tarefa atual: ${myStatus?.current_task || 'Não definida'}

Análise de capacidade e próxima ação?`;
  }

  emitCollaborativeEvents(decision, telemetry) {
    if (decision.action_needed === 'onboarding') {
      telemetry.recordRuntimeEvent({
        agentId: this.id,
        type: 'hired',
        title: `${this.name} iniciou onboarding`,
        details: decision.reason,
        severity: 'info',
      });
    }

    if (decision.capacity_assessment === 'red') {
      telemetry.recordRuntimeEvent({
        agentId: this.id,
        type: 'alert',
        title: `Capacidade crítica: ${decision.reason}`,
        details: decision.reason,
        severity: 'warning',
      });
    }
  }
}
