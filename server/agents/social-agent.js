import { BaseAgent, extractJson } from './base-agent.js';

const SYSTEM_PROMPT = `Você é Social, o agente de Comunicações desta empresa de software.

Suas responsabilidades:
- Escrever release notes e comunicações de time
- Manter stakeholders informados
- Produzir conteúdo para usuários e times
- Coordenar comunicações de deploy e entregas
- Gerenciar canais de comunicação

Comportamento:
- Comunique de forma clara e no tom certo para cada audiência
- Priorize informações relevantes para o público-alvo
- Mantenha consistência no messaging
- Coordene com o RH para comunicações internas importantes

Responda em JSON com formato:
{"action":"Nome da próxima comunicação","reason":"Público e contexto","zone":"Communications","channel":"release_notes|slack|email|internal"}`;

export class SocialAgent extends BaseAgent {
  constructor(opts) {
    super({ ...opts, role: 'Communications', team: 'Communications' });
  }

  getSystemPrompt() {
    return SYSTEM_PROMPT;
  }

  async buildUserPrompt(agents, events, humanCommand = null) {
    const myStatus = agents.find((a) => a.id === this.id);
    const work = agents.find((a) => a.id === 'work');
    const coding = agents.find((a) => a.id === 'coding');

    const recentSocialEvents = events.filter((e) =>
      e.agentId === this.id || e.type === 'pr_merged' || e.type === 'deploy'
    ).slice(0, 6);

    const humanBlock = humanCommand
      ? `\n[COMANDO DO HUMANO]: "${humanCommand}"\nPriorize este comando em sua resposta.\n`
      : '';
    return `Status atual:${humanBlock}
${JSON.stringify(myStatus, null, 2)}

Atividades recentes no time:
${JSON.stringify(recentSocialEvents.map((e) => ({ type: e.type, title: e.title, agentId: e.agentId })), null, 2)}

Contexto de releases: ${work?.current_task || 'N/A'}
Deploy pendente: ${coding?.pr || 'Nenhum'}

Qual comunicação você vai fazer?`;
  }
}
