import http from 'node:http';
import { CEO_INTERVAL_MS, PORT } from './config.js';
import { LLMRouter } from './llm/llm-router.js';
import { TelemetryService } from './services/telemetry-service.js';
import { CEOAgent } from './agents/ceo-agent.js';
import { AgentManager } from './agents/agent-manager.js';

const llmRouter = new LLMRouter();
await llmRouter.detectAvailableLLMs();

const telemetry = new TelemetryService({ llmRouter });

// CEO — own loop
const ceoAgent = new CEOAgent({
  llmRouter, telemetry, intervalMs: CEO_INTERVAL_MS,
});

// Agent workers — autonomous loops for each registered agent
const agentManager = new AgentManager({ llmRouter, telemetry });

// Bootstrap agent registry from status.json, then start both
await agentManager.bootstrap();
agentManager.start();
ceoAgent.start();

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
      sendJson(res, 200, llmRouter.getStatus());
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

    if (req.method === 'POST' && url.pathname === '/api/ceo/run-now') {
      sendJson(res, 200, await ceoAgent.runDecisionCycle());
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
      sendJson(res, 200, await agentManager.sendCommand(body.agent_id, body.command));
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
