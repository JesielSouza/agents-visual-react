import { useEffect, useMemo, useState } from 'react';
import { apiUrl } from '../utils/api';

const POLL_MS = 8000;

const PRIORITY_LABELS = { low: '!', medium: '!!', high: '!!!' };
const PRIORITY_COLORS = { low: '#6b7280', medium: '#f59e0b', high: '#ef4444' };
const STATUS_COLORS = {
  todo: '#6b7280',
  in_progress: '#f59e0b',
  done: '#22c55e',
  failed: '#ef4444',
};

function normalizePriority(priority) {
  const value = String(priority || '').toLowerCase();
  if (['urgent', 'critical', 'high'].includes(value)) return 'high';
  if (['medium', 'normal'].includes(value)) return 'medium';
  return 'low';
}

function normalizeStatus(status) {
  const value = String(status || '').toLowerCase();
  if (['pending', 'todo', 'queued'].includes(value)) return 'todo';
  if (['assigned', 'running', 'in_progress', 'in-progress', 'active'].includes(value)) return 'in_progress';
  if (['completed', 'complete', 'done'].includes(value)) return 'done';
  if (['failed', 'error'].includes(value)) return 'failed';
  return 'todo';
}

function toIsoDate(value) {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function resolveAssignedAgent(task, agentsById) {
  const agentId = task.assigned_to || task.assignedTo || task.agentId || task.agent_id || null;
  const agent = agentId ? agentsById.get(agentId) : null;
  return {
    assigned_to: agentId || 'unassigned',
    assigned_name: agent?.name || agent?.display_name || agent?.current_action || agentId || 'Sem agente',
    assigned_team: agent?.team || agent?.zone || 'General',
  };
}

function normalizeTask(task, agentsById) {
  const assignee = resolveAssignedAgent(task, agentsById);
  return {
    id: task.id || `${task.title || 'task'}-${task.createdAt || Date.now()}`,
    title: task.title || task.description || task.summary || 'Tarefa sem titulo',
    description: task.description || task.summary || '',
    project: task.project || 'general',
    priority: normalizePriority(task.priority),
    status: normalizeStatus(task.status),
    created_at: toIsoDate(task.createdAt || task.created_at),
    assigned_at: task.assignedAt ? toIsoDate(task.assignedAt) : null,
    completed_at: task.completedAt ? toIsoDate(task.completedAt) : null,
    raw_status: task.status || null,
    ...assignee,
  };
}

function normalizeStats(payload = {}) {
  return {
    total: Number(payload.total || 0),
    pending: Number(payload.pending || 0),
    assigned: Number(payload.assigned || 0),
    running: Number(payload.running || 0),
    completed: Number(payload.completed || 0),
    failed: Number(payload.failed || 0),
    by_agent: payload.by_agent || {},
  };
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
  const [stats, setStats] = useState(() => normalizeStats());

  const agentsById = useMemo(() => {
    const map = new Map();
    agents.forEach((agent) => map.set(agent.id, agent));
    return map;
  }, [agents]);

  useEffect(() => {
    let cancelled = false;

    async function fetchTasks() {
      try {
        const [statusRes, pendingRes] = await Promise.all([
          fetch(apiUrl('/api/tasks/status')),
          fetch(apiUrl('/api/tasks/pending')),
        ]);

        const statusData = statusRes.ok ? await statusRes.json() : {};
        const pendingData = pendingRes.ok ? await pendingRes.json() : { tasks: [] };

        if (cancelled) return;

        setStats(normalizeStats(statusData));
        setTasks(
          (pendingData.tasks || [])
            .map((task) => normalizeTask(task, agentsById))
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        );
      } catch {
        if (!cancelled) {
          setStats((prev) => prev || normalizeStats());
          setTasks((prev) => prev || []);
        }
      }
    }

    fetchTasks();
    const id = setInterval(fetchTasks, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [agentsById]);

  return { tasks, stats };
}
