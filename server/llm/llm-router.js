import { getJson, postJson } from '../lib/http.js';
import { MINIMAX_MODEL, MINIMAX_PORTAL_MODEL, OPENAI_MODEL } from '../config.js';

function nowIso() {
  return new Date().toISOString();
}

function summarizeError(error) {
  if (!error) return 'Unknown error';
  return String(error.message || error);
}

export class LLMRouter {
  constructor() {
    this.availableLLMs = [];
    this.primaryLLM = null;
    this.lastFallback = null;
    this.totalCalls = 0;
    this.callsByLLM = {};
    this.autoFallback = true;
    this.startupLogs = [];
    this.startupError = null;
  }

  log(line) {
    const entry = `[${nowIso()}] ${line}`;
    this.startupLogs.push(entry);
    if (this.startupLogs.length > 200) this.startupLogs.shift();
    console.log(entry);
  }

  async detectAvailableLLMs() {
    this.availableLLMs = [];
    this.primaryLLM = null;
    this.startupError = null;
    this.log('Detectando LLMs disponíveis...');

    if (process.env.OPENROUTER_API_KEY) {
      this.log('⚠ OPENROUTER_API_KEY detectada, mas OpenRouter é bloqueado e será ignorado.');
    }

    await this.tryOpenAI();
    await this.tryMiniMaxM27();
    await this.tryMiniMaxPortal();
    await this.tryOllama();
    await this.tryLmStudio();

    this.availableLLMs.sort((a, b) => a.priority - b.priority);
    this.primaryLLM = this.availableLLMs[0] || null;

    if (this.primaryLLM) {
      this.log(`🎯 LLM primária: ${this.primaryLLM.name}`);
    } else {
      this.startupError = 'Nenhuma LLM disponível. Configure pelo menos uma cloud ou local.';
      this.log(`❌ ${this.startupError}`);
    }
  }

  async tryOpenAI() {
    if (!process.env.OPENAI_API_KEY) {
      this.log('✗ OpenAI Codex não disponível (OPENAI_API_KEY ausente)');
      return;
    }

    try {
      const response = await getJson('https://api.openai.com/v1/models', {
        timeout: 3500,
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.availableLLMs.push({
        name: 'openai-codex',
        priority: 1,
        provider: 'openai',
        model: OPENAI_MODEL,
      });
      this.log('✓ OpenAI Codex disponível');
    } catch (error) {
      this.log(`✗ OpenAI Codex não disponível (${summarizeError(error)})`);
    }
  }

  async tryMiniMaxM27() {
    if (!process.env.MINIMAX_API_KEY) {
      this.log('✗ MiniMax M2.7 não disponível (MINIMAX_API_KEY ausente)');
      return;
    }

    const baseUrl = process.env.MINIMAX_API_BASE_URL || 'https://api.minimax.chat/v1';
    try {
      const response = await getJson(`${baseUrl}/models`, {
        timeout: 3500,
        headers: { Authorization: `Bearer ${process.env.MINIMAX_API_KEY}` },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.availableLLMs.push({
        name: 'minimax-m2.7',
        priority: 2,
        provider: 'minimax',
        apiKey: process.env.MINIMAX_API_KEY,
        baseUrl,
        model: MINIMAX_MODEL,
      });
      this.log('✓ MiniMax M2.7 disponível');
    } catch (error) {
      this.log(`✗ MiniMax M2.7 não disponível (${summarizeError(error)})`);
    }
  }

  async tryMiniMaxPortal() {
    if (!process.env.MINIMAX_PORTAL_KEY) {
      this.log('✗ MiniMax Portal não disponível (MINIMAX_PORTAL_KEY ausente)');
      return;
    }

    const baseUrl = process.env.MINIMAX_PORTAL_BASE_URL || process.env.MINIMAX_API_BASE_URL || 'https://api.minimax.chat/v1';
    try {
      const response = await getJson(`${baseUrl}/models`, {
        timeout: 3500,
        headers: { Authorization: `Bearer ${process.env.MINIMAX_PORTAL_KEY}` },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.availableLLMs.push({
        name: 'minimax-portal',
        priority: 3,
        provider: 'minimax',
        apiKey: process.env.MINIMAX_PORTAL_KEY,
        baseUrl,
        model: MINIMAX_PORTAL_MODEL,
      });
      this.log('✓ MiniMax Portal disponível');
    } catch (error) {
      this.log(`✗ MiniMax Portal não disponível (${summarizeError(error)})`);
    }
  }

  async tryOllama() {
    try {
      const response = await getJson('http://localhost:11434/api/tags', { timeout: 1500 });
      const models = response.data?.models || [];
      if (!response.ok || models.length === 0) throw new Error(`HTTP ${response.status || 'n/a'}`);
      this.availableLLMs.push({
        name: 'ollama-local',
        priority: 4,
        provider: 'ollama',
        baseUrl: 'http://localhost:11434',
        models: models.map((model) => model.name),
      });
      this.log(`✓ Ollama local disponível: ${models.length} modelo(s)`);
    } catch (error) {
      this.log(`✗ Ollama local não disponível (${summarizeError(error)})`);
    }
  }

  async tryLmStudio() {
    try {
      const response = await getJson('http://localhost:1234/v1/models', { timeout: 1500 });
      const models = response.data?.data || [];
      if (!response.ok || models.length === 0) throw new Error(`HTTP ${response.status || 'n/a'}`);
      this.availableLLMs.push({
        name: 'lmstudio-local',
        priority: 5,
        provider: 'lmstudio',
        baseUrl: 'http://localhost:1234/v1',
        models: models.map((model) => model.id),
      });
      this.log('✓ LM Studio local disponível');
    } catch (error) {
      this.log(`✗ LM Studio local não disponível (${summarizeError(error)})`);
    }
  }

  setPrimaryLLM(llmName) {
    const nextPrimary = this.availableLLMs.find((llm) => llm.name === llmName);
    if (!nextPrimary) throw new Error(`LLM não encontrada: ${llmName}`);
    this.primaryLLM = nextPrimary;
    this.log(`🎯 Primária alterada manualmente para ${llmName}`);
    return this.getStatus();
  }

  getFallbackChain() {
    return this.availableLLMs
      .filter((llm) => llm.name !== this.primaryLLM?.name)
      .map((llm) => llm.name);
  }

  async call(messages, options = {}) {
    if (!this.availableLLMs.length) {
      throw new Error(this.startupError || 'Nenhuma LLM disponível.');
    }

    const tools = options.tools || null;
    const maxTokens = options.maxTokens || 4000;
    const preferred = options.preferredLLM || this.primaryLLM?.name;
    const chain = [
      ...this.availableLLMs.filter((llm) => llm.name === preferred),
      ...this.availableLLMs.filter((llm) => llm.name !== preferred),
    ];

    let previousFailure = null;

    for (const llm of chain) {
      try {
        this.log(`Tentando ${llm.name}...`);
        const response = await this.callProvider(llm, { messages, tools, maxTokens });
        this.totalCalls += 1;
        this.callsByLLM[llm.name] = (this.callsByLLM[llm.name] || 0) + 1;
        if (previousFailure && llm.name !== preferred) {
          this.lastFallback = {
            from: preferred,
            to: llm.name,
            reason: previousFailure,
            at: nowIso(),
          };
        } else if (!previousFailure) {
          this.lastFallback = null;
        }
        return response;
      } catch (error) {
        previousFailure = summarizeError(error);
        this.log(`✗ ${llm.name} falhou: ${previousFailure}`);
        if (!this.autoFallback) break;
      }
    }

    throw new Error(previousFailure || 'Todas as LLMs falharam.');
  }

  async callProvider(llm, { messages, tools, maxTokens }) {
    if (llm.name === 'openai-codex') {
      const response = await postJson('https://api.openai.com/v1/chat/completions', {
        model: llm.model,
        messages,
        tools: tools || undefined,
        max_tokens: maxTokens,
      }, {
        timeout: 20000,
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      });

      if (!response.ok) throw new Error(`OpenAI HTTP ${response.status}`);
      const choice = response.data?.choices?.[0]?.message;
      return {
        content: choice?.content || '',
        tool_calls: choice?.tool_calls || null,
        llm_used: llm.name,
      };
    }

    if (llm.name === 'minimax-m2.7' || llm.name === 'minimax-portal') {
      const response = await postJson(`${llm.baseUrl}/chat/completions`, {
        model: llm.model,
        messages,
        tools: tools || undefined,
        max_tokens: maxTokens,
      }, {
        timeout: 20000,
        headers: { Authorization: `Bearer ${llm.apiKey}` },
      });

      if (!response.ok) throw new Error(`MiniMax HTTP ${response.status}`);
      const choice = response.data?.choices?.[0]?.message;
      return {
        content: choice?.content || '',
        tool_calls: choice?.tool_calls || null,
        llm_used: llm.name,
      };
    }

    if (llm.name === 'ollama-local') {
      const response = await postJson(`${llm.baseUrl}/api/chat`, {
        model: llm.models[0],
        messages,
        stream: false,
      }, {
        timeout: 30000,
      });

      if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);
      return {
        content: response.data?.message?.content || '',
        tool_calls: null,
        llm_used: `${llm.name}:${llm.models[0]}`,
      };
    }

    if (llm.name === 'lmstudio-local') {
      const response = await postJson(`${llm.baseUrl}/chat/completions`, {
        model: llm.models?.[0],
        messages,
        max_tokens: maxTokens,
      }, {
        timeout: 30000,
      });

      if (!response.ok) throw new Error(`LM Studio HTTP ${response.status}`);
      const choice = response.data?.choices?.[0]?.message;
      return {
        content: choice?.content || '',
        tool_calls: null,
        llm_used: llm.name,
      };
    }

    throw new Error(`Provider não suportado: ${llm.name}`);
  }

  getStatus() {
    return {
      available_llms: this.availableLLMs.map((llm) => llm.name),
      primary_llm: this.primaryLLM?.name || null,
      fallback_chain: this.getFallbackChain(),
      last_fallback: this.lastFallback,
      total_calls: this.totalCalls,
      calls_by_llm: this.callsByLLM,
      auto_fallback: this.autoFallback,
      startup_error: this.startupError,
      startup_logs: this.startupLogs.slice(-50),
    };
  }
}
