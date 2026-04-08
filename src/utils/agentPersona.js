const FIRST_NAMES = ['Ana', 'Bruno', 'Clara', 'Diego', 'Elisa', 'Felipe', 'Gabriela', 'Heitor', 'Iris', 'Joao', 'Karen', 'Lucas'];
const FACES = ['^_^', 'o_o', '-_-', '^o^', 'u_u', 'o^o', '>_<', 'n_n', 'o.o', '^.^'];

const PERSONA_BY_ID = {
  ceo: { name: 'Sofia', face: '*_*' },
  coding: { name: 'Bruno', face: 'o_o' },
  work: { name: 'Diego', face: '-_-' },
  social: { name: 'Clara', face: '^o^' },
  hr: { name: 'Ana', face: '^_^' },
  sargento: { name: 'SARGENTO', face: '>_<' },
  'qa-contract-01': { name: 'Gabriela', face: 'o.o' },
};

const TEAM_SKILLS = {
  Engineering: ['codigo', 'arquitetura', 'refatoracao'],
  Quality: ['testes', 'validacao', 'qa'],
  Operations: ['deploy', 'monitoramento', 'infra'],
  Communications: ['comunicacao', 'status', 'sintese'],
  'People Ops': ['organizacao', 'coordenacao', 'pessoas'],
  Flex: ['apoio', 'execucao', 'adaptacao'],
};

function hashCode(value) {
  const text = String(value || '');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (Math.imul(31, hash) + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function normalizeName(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function personaFromName(agent) {
  const normalized = normalizeName(agent?.name);
  if (!normalized) return null;
  if (normalized === 'ceo') return PERSONA_BY_ID.ceo;
  if (normalized === 'coding') return PERSONA_BY_ID.coding;
  if (normalized === 'work') return PERSONA_BY_ID.work;
  if (normalized === 'social') return PERSONA_BY_ID.social;
  if (normalized === 'rh' || normalized === 'hr') return PERSONA_BY_ID.hr;
  if (normalized === 'sargento') return PERSONA_BY_ID.sargento;
  if (normalized.includes('qa contract')) return PERSONA_BY_ID['qa-contract-01'];
  return null;
}

export function isAgentCeo(agent) {
  if (!agent) return false;
  if (agent.id === 'ceo') return true;
  const role = normalizeName(agent.role);
  const team = normalizeName(agent.team);
  return role.includes('chief executive officer') || team === 'leadership';
}

function resolvePersona(agent) {
  if (!agent) return null;
  if (PERSONA_BY_ID[agent.id]) return PERSONA_BY_ID[agent.id];
  const fromName = personaFromName(agent);
  if (fromName) return fromName;
  if (isAgentCeo(agent)) return PERSONA_BY_ID.ceo;
  return null;
}

export function getAgentDisplayName(agent) {
  if (!agent) return 'Agente';
  const persona = resolvePersona(agent);
  if (persona?.name) return persona.name;
  const idx = hashCode(agent.id || agent.name || agent.role || agent.team) % FIRST_NAMES.length;
  return FIRST_NAMES[idx];
}

export function getAgentFace(agent) {
  if (!agent) return '^_^';
  const persona = resolvePersona(agent);
  if (persona?.face) return persona.face;
  const idx = hashCode(`${agent.id || ''}:${agent.team || ''}:${agent.role || ''}`) % FACES.length;
  return FACES[idx];
}

export function getAgentFunction(agent) {
  if (!agent) return 'Sem funcao';
  return agent.role || agent.current_action || agent.team || agent.zone || 'Agente operacional';
}

export function getAgentCompetencies(agent) {
  if (!agent) return [];
  const fromTools = (agent.tools_used || []).slice(0, 3).map((tool) => String(tool).replace(/[_-]/g, ' '));
  if (fromTools.length > 0) return fromTools;
  return TEAM_SKILLS[agent.team] || TEAM_SKILLS[agent.zone] || ['execucao', 'coordenacao'];
}
