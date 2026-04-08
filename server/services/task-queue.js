import fs from 'node:fs/promises';
import { AGENTS_DIR, STATUS_FILE } from '../config.js';

function nowIso() {
  return new Date().toDateString();
}

function buildTaskId(title) {
  return `task-${title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40)}-${Date.now()}`;
}

export class TaskQueue {
  constructor({ telemetry }) {
    this.telemetry = telemetry;
    this.tasks = []; // in-memory: task objects
    this._dirty = false;
  }

  async init() {
    try {
      const raw = await fs.readFile(STATUS_FILE, 'utf8');
      const parsed = JSON.parse(raw.replace(/\uFEFF/g, ''));
      this.tasks = parsed.tasks || [];
      console.log(`[TaskQueue] Loaded ${this.tasks.length} tasks from status.json`);
    } catch {
      this.tasks = [];
      console.log('[TaskQueue] No existing tasks found, starting fresh');
    }
  }

  getPending() {
    return this.tasks.filter((t) => t.status === 'pending' || t.status === 'assigned');
  }

  getByAgent(agentId) {
    return this.tasks.filter((t) => t.agentId === agentId);
  }

  getByProject(project) {
    return this.tasks.filter((t) => t.project === project);
  }

  getBlocking() {
    return this.tasks.filter((t) => t.status === 'blocking');
  }

  async addTask({ title, agentId, project, priority = 'normal', description = null }) {
    const task = {
      id: buildTaskId(title),
      title,
      description,
      agentId: agentId || null,
      project: project || null,
      priority,
      status: agentId ? 'assigned' : 'pending',
      createdAt: nowIso(),
      assignedAt: agentId ? nowIso() : null,
      completedAt: null,
      summary: null,
    };
    this.tasks.push(task);
    this._dirty = true;
    this.telemetry.recordRuntimeEvent({
      agentId: 'ceo',
      type: 'task_created',
      title: `Task criada: ${title}`,
      details: agentId ? `Designada para ${agentId}` : 'Sem agente atribuído',
      severity: 'info',
    });
    return task;
  }

  async assignTask(taskId, agentId) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return null;
    task.agentId = agentId;
    task.status = 'assigned';
    task.assignedAt = nowIso();
    this._dirty = true;
    this.telemetry.recordRuntimeEvent({
      agentId: 'ceo',
      type: 'task_assigned',
      title: `Task atribuída a ${agentId}: ${task.title}`,
      details: task.description || null,
      severity: 'info',
    });
    return task;
  }

  async completeTask(taskId, summary = null) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return null;
    task.status = 'completed';
    task.completedAt = nowIso();
    task.summary = summary;
    this._dirty = true;
    this.telemetry.recordRuntimeEvent({
      agentId: task.agentId || 'ceo',
      type: 'task_completed',
      title: `Task concluída: ${task.title}`,
      details: summary || null,
      severity: 'success',
    });
    return task;
  }

  async failTask(taskId, reason) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return null;
    task.status = 'failed';
    task.completedAt = nowIso();
    task.summary = reason;
    this._dirty = true;
    this.telemetry.recordRuntimeEvent({
      agentId: task.agentId || 'ceo',
      type: 'task_failed',
      title: `Task falhou: ${task.title}`,
      details: reason,
      severity: 'error',
    });
    return task;
  }

  async syncToStatusJson() {
    if (!this._dirty) return;
    try {
      const raw = await fs.readFile(STATUS_FILE, 'utf8');
      const parsed = JSON.parse(raw.replace(/\uFEFF/g, ''));
      parsed.tasks = this.tasks;
      parsed.updatedAt = new Date().toISOString();
      await fs.writeFile(STATUS_FILE, JSON.stringify(parsed, null, 2), 'utf8');
      this._dirty = false;
      console.log('[TaskQueue] Synced to status.json');
    } catch (err) {
      console.error(`[TaskQueue] Sync failed: ${err.message}`);
    }
  }

  getStatus() {
    const all = this.tasks;
    return {
      total: all.length,
      pending: all.filter((t) => t.status === 'pending').length,
      assigned: all.filter((t) => t.status === 'assigned').length,
      running: all.filter((t) => t.status === 'running').length,
      completed: all.filter((t) => t.status === 'completed').length,
      failed: all.filter((t) => t.status === 'failed').length,
      by_agent: [...new Set(all.map((t) => t.agentId).filter(Boolean))].reduce((acc, aid) => {
        acc[aid] = all.filter((t) => t.agentId === aid && t.status !== 'completed' && t.status !== 'failed').length;
        return acc;
      }, {}),
    };
  }
}
