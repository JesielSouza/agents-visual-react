import path from 'node:path';

export const ROOT_DIR = path.resolve(process.cwd());
export const WORKSPACE_DIR = path.resolve(ROOT_DIR, '..');
export const AGENTS_DIR = path.resolve(WORKSPACE_DIR, 'agents');
export const STATUS_FILE = path.resolve(AGENTS_DIR, 'status.json');
export const EVENTS_FILE = path.resolve(AGENTS_DIR, 'events.json');
export const PORT = Number(process.env.OPENCLAW_BRIDGE_PORT || 8787);
export const CEO_INTERVAL_MS = Number(process.env.CEO_INTERVAL_MS || 60000);
export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4-turbo';
export const MINIMAX_MODEL = process.env.MINIMAX_MODEL || 'minimax-m2.7';
export const MINIMAX_PORTAL_MODEL = process.env.MINIMAX_PORTAL_MODEL || 'minimax-portal';
