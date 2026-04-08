import http from 'node:http';
import { CEO_INTERVAL_MS, PORT } from './config.js';
import { LLMRouter } from './llm/llm-router.js';
import { TelemetryService } from './services/telemetry-service.js';
import { CEOAgent } from './agents/ceo-agent.js';
import { AgentManager } from './agents/agent-manager.js';
import { OpenClawBridge } from './services/openclaw-bridge.js';
import { detectAgents, buildRouting } from './lib/chat-router.js';
import { promptLoader } from './llm/prompt-loader.js';

function createUnavailableTaskQueue() {
  const reason = 'Task queue unavailable in this runtime.';
  return {
    available: false,
    reason,
    async init() {},
    async syncToStatusJson() {},
    getStatus() {
      return {
        total: 0,
        pending: 0,
        assigned: 0,
        running: 0,
        completed: 0,
        failed: 0,
        by_agent: {},
      };
    },
    getPending() {
      return [];
    },
    async addTask() {
      throw new Error(reason);
    },
    async assignTask() {
      throw new Error(reason);
    },
    async completeTask() {
      throw new Error(reason);
    },
  };
}

async function createTaskQueue(telemetry) {
  try {
    const { TaskQueue } = await import('./services/task-queue.js');
    const taskQueue = new TaskQueue({ telemetry });
    await taskQueue.init();
    taskQueue.available = true;
    return taskQueue;
  } catch (error) {
    console.warn(`[Bootstrap] TaskQueue unavailable: ${error.message}`);
    return createUnavailableTaskQueue();
  }
}

const llmRouter = new LLMRouter();
await llmRouter.detectAvailableLLMs();
promptLoader.watchPrompts();

const openClawBridge = new OpenClawBridge();
openClawBridge.start();

const telemetry = new TelemetryService({ llmRouter, openClawBridge });
const disableAutonomousLoops = process.env.DISABLE_AUTONOMOUS_LOOPS === 'true';

// Task queue — initialized from status.json
const taskQueue = await createTaskQueue(telemetry);

// CEO — own loop, now with task awareness
const ceoAgent = new CEOAgent({
  llmRouter,
  telemetry,
  taskQueue,
  agentManager: null, // set below after agentManager is created
  intervalMs: CEO_INTERVAL_MS,
});

// Agent workers — autonomous loops for each registered agent
const agentManager = new AgentManager({ llmRouter, telemetry });

// Back-reference now that both exist
ceoAgent.agentManager = agentManager;

// Bootstrap agent registry from status.json, then start both
await agentManager.bootstrap();
if (!disableAutonomousLoops) {
  agentManager.start();
  ceoAgent.start();
} else {
  console.log('[OpenClaw Bridge] Autonomous loops disabled by DISABLE_AUTONOMOUS_LOOPS=true');
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  res.end(JSON.stringify(payload, null, 2));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function ensureTaskQueue(res, taskQueue) {
  if (taskQueue.available !== false) return true;
  sendJson(res, 503, {
    error: taskQueue.reason || 'Task queue unavailable.',
  });
  return false;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    });
    res.end();
    return;
  }

  try {
    if (req.method === 'GET' && url.pathname === '/api/health') {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/agents/status') {
      sendJson(res, 200, await telemetry.getAgentsStatus());
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/events') {
      sendJson(res, 200, { events: await telemetry.getMergedEvents() });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/llm/status') {
      const status = llmRouter.getStatus();
      status.openclaw_bridge = openClawBridge.getBridgeStatus();
      status.gateway_up = openClawBridge.isGatewayUp();
      // Include per-LLM cooldown state
      status.rate_limited = {};
      for (const [name, until] of llmRouter._rateLimitedUntil) {
        const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
        status.rate_limited[name] = { cooldown_seconds: remaining };
      }
      // Include circuit breaker state
      status.circuit_open = {};
      for (const [name, fails] of llmRouter._consecutiveFailures) {
        if (fails >= llmRouter._CIRCUIT_THRESHOLD) {
          status.circuit_open[name] = true;
        }
      }
      sendJson(res, 200, status);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/llm/fallback-events') {
      const raw = await telemetry.getMergedEvents();
      const fallbackEvents = raw
        .filter((e) => e.type === 'llm_fallback')
        .slice(0, 20)
        .map((e) => ({
          agentId: e.agentId,
          from_llm: e.from_llm,
          to_llm: e.to_llm,
          reason: e.reason,
          severity: e.severity,
          timestamp: e.timestamp,
        }));
      sendJson(res, 200, { fallback_events: fallbackEvents });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/agents/manager') {
      sendJson(res, 200, agentManager.getStatus());
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/llm/set-primary') {
      const body = await readBody(req);
      sendJson(res, 200, llmRouter.setPrimaryLLM(body.llm_name));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/llm/test') {
      const body = await readBody(req);
      const result = await llmRouter.call([
        { role: 'system', content: 'Reply with a short health-check.' },
        { role: 'user', content: 'health-check' },
      ], {
        maxTokens: 32,
        preferredLLM: body.llm_name || llmRouter.primaryLLM?.name,
      });
      sendJson(res, 200, result);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/codex/ask') {
      const body = await readBody(req);
      const question = (body.question || '').trim();
      if (!question) {
        sendJson(res, 400, { success: false, error: 'question e obrigatoria' });
        return;
      }

      const result = await llmRouter.complete(question, {
        preferredLLM: body.provider || llmRouter.primaryLLM?.name,
        useCodexPrompt: true,
        compactCodexPrompt: body.compactPrompt !== false,
        includeExamples: body.includeExamples !== false,
        includeFileTree: body.includeFileTree === true,
        maxTokens: body.maxTokens || 1200,
      });

      sendJson(res, 200, {
        success: true,
        question,
        response: result.content || '',
        provider: body.provider || llmRouter.primaryLLM?.name || null,
        llm_used: result.llm_used || null,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/codex/prompt') {
      const prompt = promptLoader.buildCodexPrompt({
        includeFileTree: url.searchParams.get('tree') === 'true',
      });
      sendJson(res, 200, {
        success: true,
        prompt,
        length: prompt.length,
        sections: {
          base: prompt.includes('Codex'),
          examples: prompt.includes('Exemplos') || prompt.includes('cenario'),
          context: prompt.includes('Contexto Atual do Projeto'),
        },
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/ceo/run-now') {
      sendJson(res, 200, await ceoAgent.runDecisionCycle());
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/sync') {
      await telemetry.syncRuntimeStateToFile();
      await telemetry.syncHistoryToFile();
      await taskQueue.syncToStatusJson();
      sendJson(res, 200, { ok: true, synced_at: new Date().toISOString() });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/agents/run-now') {
      const body = await readBody(req);
      if (!body.agent_id) {
        sendJson(res, 400, { error: 'agent_id required' });
        return;
      }
      sendJson(res, 200, await agentManager.triggerAgent(body.agent_id));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/agents/command') {
      const body = await readBody(req);
      if (!body.agent_id || !body.command) {
        sendJson(res, 400, { error: 'agent_id e command são obrigatórios' });
        return;
      }
      const result = await agentManager.sendCommand(body.agent_id, body.command);
      // Record command event for history
      telemetry.recordCommandEvent({
        agentId: body.agent_id,
        agentName: agentManager.agents.get(body.agent_id)?.name || body.agent_id,
        command: body.command,
        status: result.ok === false ? 'error' : 'completed',
        result: result.action || null,
        llmUsed: result.llm_used || null,
      });
      sendJson(res, 200, result);
      return;
    }

    // Direct agent chat endpoint (used by OfficeChatView)
    if (req.method === 'POST' && url.pathname === '/api/chat/agent') {
      const body = await readBody(req);
      if (!body.agent_id || !body.message || !body.system_prompt) {
        sendJson(res, 400, { error: 'agent_id, message e system_prompt são obrigatórios' });
        return;
      }

      const history = Array.isArray(body.history)
        ? body.history
            .filter((item) => item && typeof item.role === 'string' && typeof item.content === 'string')
            .map((item) => ({ role: item.role, content: item.content }))
        : [];

      const result = await llmRouter.call([
        { role: 'system', content: body.system_prompt },
        ...history,
        { role: 'user', content: body.message },
      ], {
        maxTokens: Number(body.max_tokens) || 1000,
        preferredLLM: body.llm_name || llmRouter.primaryLLM?.name,
      });

      sendJson(res, 200, {
        ok: true,
        agent_id: body.agent_id,
        reply: result.content || '',
        llm_used: result.llm_used || null,
      });
      return;
    }

    // Natural-language chat endpoint
    if (req.method === 'POST' && url.pathname === '/api/chat') {
      const body = await readBody(req);
      const message = (body.message || '').trim();
      if (!message) {
        sendJson(res, 400, { error: 'message é obrigatório' });
        return;
      }

      const detected = detectAgents(message);
      const routing = buildRouting(detected, message);

      // Execute for each routed agent
      const results = await Promise.allSettled(
        routing.map(async ({ agentId, command }) => {
          if (agentId === 'ceo') {
            const result = await ceoAgent.runWithCommand(command);
            return { agent_id: 'ceo', ...result };
          }
          const agent = agentManager.agents.get(agentId);
          if (!agent) {
            return { agent_id: agentId, ok: false, error: `Agent ${agentId} not found` };
          }
          if (typeof agent.runWithReply !== 'function') {
            // Fallback to old sendCommand if runWithReply not available
            const fallback = await agentManager.sendCommand(agentId, command);
            return { agent_id: agentId, reply: fallback.action || 'Ok.', action: fallback.action || 'executando', llm_used: null, ...fallback };
          }
          const result = await agent.runWithReply(command);
          return { agent_id: agentId, ...result };
        })
      );

      // Record each chat result as a chat event
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) {
          const rv = r.value;
          telemetry.recordChatEvent({
            from: 'human',
            fromName: 'Human',
            to: rv.agent_id,
            message,
            reply: rv.reply || rv.action || null,
            type: 'direct',
            agentId: rv.routed_to || rv.agent_id || null,
            llmUsed: rv.llm_used || null,
          });
        }
      }

      sendJson(res, 200, {
        message,
        routing,
        results: results.map((r, i) => {
          if (r.status === 'fulfilled') {
            return {
              ...r.value,
              llm_used: r.value.llm_used || llmRouter.primaryLLM?.name || null,
            };
          }
          const errMsg = String(r.reason?.message || r.reason);
          const agentId = routing[i]?.agentId || 'unknown';
          let error_detail = errMsg;
          if (errMsg.includes('fetch failed') || errMsg.includes('ECONNREFUSED')) {
            error_detail = `Ollama não está respondendo. Verifique se o servidor local está ativo.`;
          } else if (errMsg.includes('aborted')) {
            error_detail = `Timeout na chamada. O modelo pode estar sobrecarregado.`;
          } else if (errMsg.includes('429')) {
            error_detail = `LLM com rate limit. Aguarde alguns minutos e tente novamente.`;
          } else if (errMsg.includes('quota')) {
            error_detail = `Quota da LLM esgotada. Gemini: aguarde reset ou use Ollama como fallback.`;
          }
          return {
            agent_id: agentId,
            ok: false,
            error: errMsg,
            error_detail,
          };
        }),
        llm_status: llmRouter.getStatus(),
      });
      return;
    }

    // Task queue endpoints
    if (req.method === 'GET' && url.pathname === '/api/tasks/status') {
      if (!ensureTaskQueue(res, taskQueue)) return;
      sendJson(res, 200, taskQueue.getStatus());
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/tasks/pending') {
      if (!ensureTaskQueue(res, taskQueue)) return;
      sendJson(res, 200, { tasks: taskQueue.getPending() });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/tasks/add') {
      if (!ensureTaskQueue(res, taskQueue)) return;
      const body = await readBody(req);
      if (!body.title) {
        sendJson(res, 400, { error: 'title é obrigatório' });
        return;
      }
      const task = await taskQueue.addTask({
        title: body.title,
        agentId: body.agent_id || null,
        project: body.project || null,
        priority: body.priority || 'normal',
        description: body.description || null,
      });
      sendJson(res, 200, { ok: true, task });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/tasks/assign') {
      if (!ensureTaskQueue(res, taskQueue)) return;
      const body = await readBody(req);
      if (!body.task_id || !body.agent_id) {
        sendJson(res, 400, { error: 'task_id e agent_id são obrigatórios' });
        return;
      }
      const task = await taskQueue.assignTask(body.task_id, body.agent_id);
      if (!task) {
        sendJson(res, 404, { error: 'Task não encontrada' });
        return;
      }
      sendJson(res, 200, { ok: true, task });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/tasks/complete') {
      if (!ensureTaskQueue(res, taskQueue)) return;
      const body = await readBody(req);
      if (!body.task_id) {
        sendJson(res, 400, { error: 'task_id é obrigatório' });
        return;
      }
      const task = await taskQueue.completeTask(body.task_id, body.summary || null);
      if (!task) {
        sendJson(res, 404, { error: 'Task não encontrada' });
        return;
      }
      sendJson(res, 200, { ok: true, task });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/tasks/history') {
      // Return recent task events from merged events
      const raw = await telemetry.getMergedEvents();
      const taskEvents = raw
        .filter((e) => ['task_created', 'task_assigned', 'task_completed', 'task_failed', 'agent_decision', 'ceo_decision'].includes(e.type))
        .slice(0, 50)
        .map((e) => ({
          id: e.id,
          agentId: e.agentId,
          type: e.type,
          title: e.title,
          details: e.details || null,
          severity: e.severity,
          timestamp: e.timestamp,
        }));
      sendJson(res, 200, { events: taskEvents, total: taskEvents.length });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/chat/history') {
      const agentId = url.searchParams.get('agentId') || undefined;
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const history = telemetry.getChatHistory({ agentId, limit });
      // Normalize for frontend: ensure each item has clear direction
      const normalized = history.map((item) => ({
        id: item.id,
        direction: item.direction || (item.from === 'human' ? 'incoming' : 'outgoing'),
        from: item.from,
        fromName: item.fromName,
        fromTeam: item.fromTeam || null,
        to: item.to,
        message: item.message || null,
        reply: item.reply || null,
        type: item.type || 'direct',
        agentId: item.agentId || null,
        llm_used: item.llm_used || null,
        timestamp: item.timestamp,
      }));
      sendJson(res, 200, { history: normalized, total: normalized.length, source: normalized.length > 0 ? 'backend' : 'empty' });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/commands/history') {
      const agentId = url.searchParams.get('agentId') || undefined;
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const history = telemetry.getCommandHistory({ agentId, limit });
      sendJson(res, 200, { history, total: history.length, source: history.length > 0 ? 'backend' : 'empty' });
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    sendJson(res, 500, {
      error: error.message || 'Internal server error',
      llm_status: llmRouter.getStatus(),
    });
  }
});

server.listen(PORT, () => {
  console.log(`[OpenClaw Bridge] API online em http://localhost:${PORT}`);
  console.log(`[OpenClaw Bridge] ${agentManager.agents.size} agentes + CEO ativos`);
});
