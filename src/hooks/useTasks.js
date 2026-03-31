import { useState, useEffect, useRef } from 'react';
import { playSuccess } from '../utils/pixelSounds';

const POLL_MS = 8000;

const PRIORITY_LABELS = { low: '!', medium: '!!', high: '!!!' };
const PRIORITY_COLORS = { low: '#6b7280', medium: '#f59e0b', high: '#ef4444' };
const STATUS_COLORS = { todo: '#6b7280', in_progress: '#f59e0b', done: '#22c55e' };

const TASK_TEMPLATES = [
  'Revisar pull request', 'Atualizar documentacao', 'Corrigir bug no modulo de auth',
  'Fazer deploy em staging', 'Escrever testes unitarios', 'Refatorar camada da API',
  'Otimizar queries do banco', 'Sessao de code review', 'Atualizar dependencias',
  'Criar pipeline de CI', 'Corrigir vazamento de memoria', 'Revisar arquitetura',
  'Escrever script de migracao', 'Atualizar configuracao', 'Corrigir teste instavel',
  'Implementar cache', 'Adicionar logs', 'Auditoria de seguranca',
  'Perfil de performance', 'Atualizar README',
];

function seededRandom(seed) {
  return ((Math.sin(seed + 1) * 10000) % 1 + 1) % 1;
}

function generateTasks(agents, count = 8) {
  const tasks = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const seed = i * 17 + 3;
    const agentIdx = Math.floor(seededRandom(seed) * agents.length);
    const agent = agents[agentIdx] || agents[0];
    const statusSeed = i * 7 + 11;
    const prioritySeed = i * 13 + 5;

    const statuses = ['todo', 'todo', 'todo', 'in_progress', 'in_progress', 'done', 'done', 'done'];
    const priorities = ['low', 'low', 'medium', 'medium', 'medium', 'high'];

    const status = statuses[Math.floor(seededRandom(statusSeed) * statuses.length)];
    const priority = priorities[Math.floor(seededRandom(prioritySeed) * priorities.length)];
    const template = TASK_TEMPLATES[Math.floor(seededRandom(i * 5 + 2) * TASK_TEMPLATES.length)];

    const createdAt = new Date(now - Math.floor(seededRandom(i * 3 + 7) * 3600000 * 24));

    tasks.push({
      id: `task-${i + 1}`,
      title: template,
      assigned_to: agent?.id || 'unknown',
      assigned_name: agent?.name || 'Unknown',
      assigned_team: agent?.team || agent?.zone || 'Engineering',
      status,
      priority,
      created_at: createdAt.toISOString(),
    });
  }

  return tasks.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.priority] - order[b.priority]);
  });
}

function relativeTime(date) {
  const diff = Date.now() - new Date(date).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `ha ${min}min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `ha ${hr}h`;
  const dy = Math.floor(hr / 24);
  return `ha ${dy}d`;
}

export { relativeTime, STATUS_COLORS, PRIORITY_COLORS, PRIORITY_LABELS };

export function useTasks(agents) {
  const [tasks, setTasks] = useState([]);
  const tasksRef = useRef([]);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current || agents.length === 0) return;
    const initial = generateTasks(agents, 10);
    tasksRef.current = initial;
    setTasks(initial);
    initializedRef.current = true;
  }, [agents]); // run once when agents load

  useEffect(() => {
    const id = setInterval(() => {
      // Randomly advance one task
      setTasks((prev) => {
        const next = [...prev];
        const todoIdx = next.findIndex((t) => t.status === 'todo');
        const inProgIdx = next.findIndex((t) => t.status === 'in_progress');

        if (todoIdx !== -1 && Math.random() > 0.5) {
          next[todoIdx] = { ...next[todoIdx], status: 'in_progress' };
        } else if (inProgIdx !== -1 && Math.random() > 0.6) {
          next[inProgIdx] = { ...next[inProgIdx], status: 'done' };
          playSuccess({ volume: 0.4, category: 'notifications', from: 420, to: 860 });
        } else if (todoIdx !== -1) {
          next[todoIdx] = { ...next[todoIdx], status: 'in_progress' };
        }

        tasksRef.current = next;
        return next;
      });
    }, POLL_MS);

    return () => clearInterval(id);
  }, []);

  return { tasks };
}
