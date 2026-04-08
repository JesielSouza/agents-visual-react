# Stack

## Overview

`agents-visual-react` is a split frontend/backend JavaScript project:

- Frontend: React 19 + Vite 8
- Styling: Tailwind CSS 3 plus custom CSS in `src/index.css` and `src/App.css`
- Backend: Node.js HTTP server using native `node:http`
- Module format: ESM across frontend and backend (`"type": "module"` in `package.json`)
- Runtime shape: local UI demo + local bridge API + shared state files in sibling workspace folder `../agents`

## Runtime And Tooling

- Package manifest: `package.json`
- Dev server: `vite --configLoader native`
- API server: `node server/index.js`
- Build: `vite build`
- Lint: `eslint .`
- Frontend entry: `src/main.jsx`
- Backend entry: `server/index.js`

## Frontend Libraries

- `react`, `react-dom`
- `@vitejs/plugin-react`
- `tailwindcss`, `postcss`, `autoprefixer`
- `eslint`, `@eslint/js`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`

## Backend Dependencies

There are no external backend npm dependencies beyond the shared JS toolchain. The backend is intentionally built on:

- `node:http`
- `node:fs/promises`
- `node:path`
- project-local modules under `server/`

## Configuration Files

- `vite.config.js`: proxies `/api` and `/agents` to `http://localhost:8787`
- `tailwind.config.js`: defines domain-specific room colors (`eng`, `ops`, `qa`, `comms`, `people`, `flex`)
- `eslint.config.js`: flat config for `js` and `jsx`, ignores `dist`
- `postcss.config.js`: Tailwind/PostCSS wiring
- `index.html`: browser shell; README notes optional Tone.js CDN use for BGM

## Environment Variables

Defined or consumed in `server/config.js` and `server/llm/llm-router.js`:

- `OPENCLAW_BRIDGE_PORT`
- `CEO_INTERVAL_MS`
- `DISABLE_AUTONOMOUS_LOOPS`
- `OPENAI_API_KEY`, `OPENAI_MODEL`
- `MINIMAX_API_KEY`, `MINIMAX_API_BASE_URL`, `MINIMAX_MODEL`
- `MINIMAX_PORTAL_KEY`, `MINIMAX_PORTAL_BASE_URL`, `MINIMAX_PORTAL_MODEL`
- `GOOGLE_API_KEY`, `GEMINI_MODEL`
- `OLLAMA_MODEL`
- `VITE_API_BASE_URL` on the frontend

## Shared Workspace Dependencies

The backend is coupled to files outside this repo:

- `server/config.js` resolves `WORKSPACE_DIR = ..`
- `AGENTS_DIR` points to `../agents`
- `STATUS_FILE` points to `../agents/status.json`
- `EVENTS_FILE` points to `../agents/events.json`

This means the app is not self-contained inside the repo root.

## Docs And Design References

- `README.md`: current architecture and runbook
- `docs/adr/0001-llm-serving-direction.md`: accepted LLM serving direction
- `docs/llm-inference-matrix.md`: runtime/model selection guidance

## Current Maturity

The codebase is set up as a working visual demo with backend orchestration hooks, but not yet as a production-hardened product. The stack favors local development speed and explicit code over frameworks with deeper abstractions.
