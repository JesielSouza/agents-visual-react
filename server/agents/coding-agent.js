import { BaseAgent, extractJson } from './base-agent.js';

const SYSTEM_PROMPT = `Você é Coding, o agente de Engenharia desta empresa de software.

Suas responsabilidades:
- Implementar features e corrigir bugs
- Escrever código, testes e documentação técnica
- Fazer code review
- Manter a qualidade e padrões do codebase
- Colaborar com QA para validação

Comportamento:
- Quando receber uma tarefa, implemente com qualidade
- Divida tarefas grandes em passos menores
- Documente decisões técnicas
- Registre progresso no summary

Responda em JSON com formato:
{"action":"Nome da próxima ação","reason":"Por que está tomando essa decisão","zone":"Engineering","collaborators":["qa-agent"],"blocking":false}`;

export class CodingAgent extends BaseAgent {
  constructor(opts) {
    super({ ...opts, role: 'Engineering', team: 'Engineering' });
    this.tools = ['read_file', 'write_file', 'run_command', 'git'];
  }

  getSystemPrompt() {
    return SYSTEM_PROMPT;
  }

  async buildUserPrompt(agents, events, humanCommand = null) {
    const myStatus = agents.find((a) => a.id === this.id);
    const qaAgent = agents.find((a) => a.id === 'qa-contract-01');
    const hrAgent = agents.find((a) => a.id === 'hr');
    const recentEvents = events.filter((e) =>
      e.agentId === this.id || e.type === 'task_started' || e.type === 'task_completed'
    ).slice(0, 8);

    const humanBlock = humanCommand
      ? `\n[COMANDO DO HUMANO]: "${humanCommand}"\nPriorize este comando em sua resposta.\n`
      : '';
    return `Contexto:${humanBlock}
${JSON.stringify(myStatus, null, 2)}

Agentes disponíveis:
- QA (qa-contract-01): ${qaAgent?.current_task || 'Disponível'}
- RH (hr): ${hrAgent?.current_task || 'Disponível'}

Eventos recentes:
${JSON.stringify(recentEvents.map((e) => ({ type: e.type, title: e.title, agentId: e.agentId })), null, 2)}

Branches ativos: ${myStatus?.branch || 'Nenhum'}
PRs abertos: ${myStatus?.pr || 'Nenhum'}

O que você vai fazer agora?`;
  }

  parseDecision(raw) {
    const base = extractJson(raw);
    return {
      action: base.action,
      reason: base.reason,
      zone: base.zone || 'Engineering',
      collaborators: base.collaborators || [],
      blocking: base.blocking || false,
    };
  }

  emitCollaborativeEvents(decision, telemetry) {
    if (decision.collaborators?.length > 0) {
      decision.collaborators.forEach((collabId) => {
        telemetry.recordRuntimeEvent({
          agentId: this.id,
          type: 'agent_mentioned',
          title: `${this.name} solicitou colaboração de ${collabId}`,
          details: decision.action,
          severity: 'info',
        });
      });
    }

    if (decision.blocking) {
      telemetry.recordRuntimeEvent({
        agentId: this.id,
        type: 'agent_blocked',
        title: `${this.name} está bloqueado: ${decision.reason}`,
        details: decision.reason,
        severity: 'warning',
      });
    }
  }
}
