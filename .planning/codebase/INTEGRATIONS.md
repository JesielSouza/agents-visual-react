# Integrations

## Overview

The project integrates primarily with local infrastructure and optional cloud LLM providers. Most integrations are brokered by `server/index.js` and `server/llm/llm-router.js`.

## Internal Workspace Integrations

### Shared agent status and event files

- `server/config.js`
- `server/services/telemetry-service.js`
- `server/services/task-queue.js`

Integration points:

- `../agents/status.json`
- `../agents/events.json`

Purpose:

- bootstrap agent roster
- read agent status snapshots
- merge runtime events with persisted events
- persist chat history, command history, task state, and runtime agent state

Risk:

- the repo depends on sibling workspace structure being intact
- missing or malformed JSON in `../agents` breaks core behavior

## Frontend To Backend API

Frontend integration utility:

- `src/utils/api.js`

Vite proxy:

- `vite.config.js`

Core endpoints in `server/index.js`:

- `GET /api/health`
- `GET /api/agents/status`
- `GET /api/events`
- `GET /api/llm/status`
- `GET /api/llm/fallback-events`
- `GET /api/agents/manager`
- `POST /api/llm/set-primary`
- `POST /api/llm/test`
- `POST /api/codex/ask`
- `GET /api/codex/prompt`
- `POST /api/ceo/run-now`
- `POST /api/sync`
- `POST /api/agents/run-now`
- `POST /api/agents/command`
- `POST /api/chat/agent`
- `POST /api/chat`
- task endpoints under `/api/tasks/*`
- history endpoints under `/api/chat/history` and `/api/commands/history`

## LLM Provider Integrations

Defined in `server/llm/llm-router.js`:

- OpenAI `https://api.openai.com/v1/...`
- MiniMax `https://api.minimax.chat/v1/...` or custom base URL
- Gemini `https://generativelanguage.googleapis.com/v1beta/...`
- Ollama `http://localhost:11434`
- LM Studio `http://localhost:1234/v1`

Behavior:

- detects availability on startup
- selects a primary provider by priority
- supports fallback chain
- tracks cooldowns, consecutive failures, and quota exhaustion

## Prompt System Integration

- `server/llm/prompt-loader.js`
- `server/llm/system-prompts/codex-base.txt`
- `server/llm/system-prompts/codex-base-compact.txt`
- `server/llm/system-prompts/codex-examples.txt`

Purpose:

- compose system prompts for `/api/codex/ask`
- optionally include examples and project context
- watch prompt files for live updates during development

## Chat Routing Integration

- `server/lib/chat-router.js`

Purpose:

- detect target agent(s) from Portuguese/English natural-language text
- map messages to CEO or specific worker agents

## Browser Platform Integrations

- `localStorage` for command history in `src/hooks/useCommandCenter.js`
- `localStorage` for sound settings in `src/utils/pixelSounds.js` per README
- `Web Audio API` for retro SFX
- optional `window.Tone` loaded via CDN for BGM, referenced in README and prompt examples

## Missing Or Deferred Integrations

Not present yet:

- authentication provider
- database
- external queue/broker
- telemetry SaaS
- automated secret management
- CI-hosted deployment integration

This keeps the integration surface small, but it also means persistence and orchestration are tightly coupled to local files and runtime state.
