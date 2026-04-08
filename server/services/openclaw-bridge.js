/**
 * OpenClaw Bridge
 * Determines SARGENTO's real status by:
 *  1. Checking if the OpenClaw gateway is reachable (HTTP on port 18789)
 *  2. Reading the local openclaw.json to verify channel config
 *
 * No CLI subprocess required - avoids path/shell issues on Windows.
 */

import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';

const POLL_MS = 15_000;
const GATEWAY_PORT = 18789;
const OPENCLAW_CONFIG = path.join(os.homedir(), '.openclaw', 'openclaw.json');

function checkGatewayReachable() {
  return new Promise((resolve) => {
    const req = http.get(
      { hostname: '127.0.0.1', port: GATEWAY_PORT, path: '/', timeout: 4000 },
      (res) => { res.resume(); resolve(res.statusCode < 600); },
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function readOpenClawConfig() {
  try {
    const raw = await fs.readFile(OPENCLAW_CONFIG, 'utf8');
    return JSON.parse(raw.replace(/\uFEFF/g, ''));
  } catch {
    return null;
  }
}

function getSargentoChannelConfig(cfg) {
  return cfg?.channels?.telegram?.accounts?.sargento ?? null;
}

function getSargentoBinding(cfg) {
  return (cfg?.bindings || []).find((binding) =>
    binding?.agentId === 'sargento' &&
    binding?.match?.channel === 'telegram' &&
    binding?.match?.accountId === 'sargento'
  ) ?? null;
}

function getTelegramDetails(cfg, channelCfg) {
  const pluginEnabled = cfg?.plugins?.entries?.telegram?.enabled !== false;
  const channelEnabled = cfg?.channels?.telegram?.enabled !== false;
  const accountEnabled = channelCfg?.enabled !== false;
  const binding = getSargentoBinding(cfg);
  const token = channelCfg?.botToken || channelCfg?.token || channelCfg?.env?.TELEGRAM_BOT_TOKEN || null;
  const tokenPresent = typeof token === 'string' && token.length > 10;

  const issues = [];
  if (!pluginEnabled) issues.push('plugin_telegram_disabled');
  if (!channelEnabled) issues.push('channel_telegram_disabled');
  if (!channelCfg) issues.push('account_sargento_missing');
  if (channelCfg && !accountEnabled) issues.push('account_sargento_disabled');
  if (channelCfg && !tokenPresent) issues.push('telegram_token_missing');
  if (!binding) issues.push('binding_sargento_telegram_missing');

  return {
    plugin_enabled: pluginEnabled,
    channel_enabled: channelEnabled,
    account_enabled: accountEnabled,
    account_present: !!channelCfg,
    binding_present: !!binding,
    token_present: tokenPresent,
    configured: !!channelCfg && tokenPresent,
    ready: pluginEnabled && channelEnabled && !!channelCfg && accountEnabled && tokenPresent && !!binding,
    issues,
  };
}

function resolveStatus(gatewayUp, telegram) {
  if (!gatewayUp) {
    return {
      status: 'blocked',
      task: 'Gateway OpenClaw offline',
      summary: 'Inicie: openclaw gateway run --verbose',
    };
  }

  if (!telegram.account_present) {
    return {
      status: 'idle',
      task: 'Canal Telegram nao configurado',
      summary: 'Execute: openclaw channels add --channel telegram --account sargento',
    };
  }

  if (!telegram.plugin_enabled || !telegram.channel_enabled) {
    return {
      status: 'idle',
      task: 'Canal Telegram desabilitado no OpenClaw',
      summary: 'Habilite plugins.entries.telegram.enabled e channels.telegram.enabled',
    };
  }

  if (!telegram.token_present) {
    return {
      status: 'idle',
      task: 'Token do bot Telegram ausente',
      summary: 'Configure botToken, token ou env.TELEGRAM_BOT_TOKEN em channels.telegram.accounts.sargento',
    };
  }

  if (!telegram.account_enabled) {
    return {
      status: 'idle',
      task: 'Canal Telegram desabilitado',
      summary: 'Habilite: channels.telegram.accounts.sargento.enabled = true',
    };
  }

  if (!telegram.binding_present) {
    return {
      status: 'idle',
      task: 'Binding Telegram do SARGENTO ausente',
      summary: 'Execute: openclaw agents bind --agent sargento --bind telegram:sargento',
    };
  }

  return {
    status: 'running',
    task: 'Monitorando leads via Telegram (polling)',
    summary: 'Bot online - aguardando mensagens de prospeccao',
  };
}

export class OpenClawBridge {
  constructor() {
    this._sargentoState = this._buildAgent('idle', 'Inicializando bridge...', null, null);
    this._timer = null;
    this._pollCount = 0;
  }

  _buildAgent(status, task, summary, telegram = null) {
    return {
      id: 'sargento',
      name: 'SARGENTO',
      role: 'Prospection Agent',
      team: 'Communications',
      zone: 'Communications',
      status,
      current_task: task,
      summary,
      tools_used: ['telegram', 'prospecting'],
      llm_provider: 'openai-codex/gpt-5.4',
      last_activity: new Date().toISOString(),
      in_meeting: false,
      autonomous: true,
      channel: 'telegram',
      channel_account: 'sargento',
      integration: {
        provider: 'openclaw',
        channel: 'telegram',
        account: 'sargento',
        ...(telegram || {}),
      },
    };
  }

  async poll() {
    this._pollCount++;
    try {
      const [gatewayUp, cfg] = await Promise.all([
        checkGatewayReachable(),
        readOpenClawConfig(),
      ]);

      const channelCfg = getSargentoChannelConfig(cfg);
      const telegram = getTelegramDetails(cfg, channelCfg);
      const { status, task, summary } = resolveStatus(gatewayUp, telegram);

      this._sargentoState = this._buildAgent(status, task, summary, telegram);
      console.log(`[OpenClawBridge] poll #${this._pollCount} -> gateway:${gatewayUp ? 'up' : 'down'} | SARGENTO: ${status}`);
    } catch (err) {
      console.error(`[OpenClawBridge] poll error: ${err.message}`);
      this._sargentoState = this._buildAgent('blocked', 'Erro no bridge OpenClaw', err.message, {
        configured: false,
        ready: false,
        issues: ['bridge_poll_error'],
      });
    }
  }

  start() {
    if (this._timer) return;
    this.poll();
    this._timer = setInterval(() => this.poll(), POLL_MS);
    console.log(`[OpenClawBridge] Iniciado (poll a cada ${POLL_MS / 1000}s)`);
  }

  stop() {
    if (!this._timer) return;
    clearInterval(this._timer);
    this._timer = null;
  }

  getSargentoStatus() {
    return { ...this._sargentoState, last_activity: new Date().toISOString() };
  }

  getBridgeStatus() {
    return {
      gateway_up: this.isGatewayUp(),
      poll_count: this._pollCount,
      poll_interval_ms: POLL_MS,
      sargento: this.getSargentoStatus(),
    };
  }

  isGatewayUp() {
    return this._sargentoState.status !== 'blocked' ||
      !this._sargentoState.current_task.includes('offline');
  }
}
