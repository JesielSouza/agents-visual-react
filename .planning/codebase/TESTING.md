# Testing

## Current State

There is no formal automated test suite in this repository at the moment.

Absent indicators:

- no `test` script in `package.json`
- no Jest, Vitest, Playwright, Cypress, or Testing Library dependencies
- no `tests/`, `__tests__/`, or `*.test.*` files in the tracked source layout
- no CI test workflow visible in the repo root

## Existing Verification Practices

Based on `README.md`, current verification is mostly manual:

- production build validated with `npm run build`
- frontend behavior checked visually
- audio behavior requires manual browser validation
- LLM fallback paths are acknowledged as not fully validated in the current environment

## Practical Validation Points In Code

Even without tests, these are the most test-sensitive areas:

- `src/hooks/useAgents.js`: polling, animation timing, zone transitions, meeting entry/exit
- `src/hooks/useCommandCenter.js`: command submission and history merge logic
- `server/index.js`: endpoint routing, body parsing, error handling
- `server/llm/llm-router.js`: provider detection, fallback logic, rate-limit/circuit behavior
- `server/services/telemetry-service.js`: JSON persistence and event/history normalization
- `server/services/task-queue.js`: task lifecycle and file sync
- `server/lib/chat-router.js`: natural-language routing heuristics

## What Is Safe To Rely On

Currently, the most reliable automated checks are:

- linting via `eslint .`
- build success via `vite build`

These catch syntax and some hook misuse, but they do not validate behavior.

## Testing Gaps

Major gaps:

- no unit tests for routing, task queue, or telemetry transformations
- no integration tests for API endpoints
- no component tests for interactive panels
- no smoke tests for the browser office views
- no contract tests for the `../agents/status.json` and `../agents/events.json` schemas
- no regression tests for LLM fallback ordering

## Recommended First Tests

Highest-value first additions:

1. unit tests for `server/lib/chat-router.js`
2. unit tests for `server/services/task-queue.js`
3. integration tests for selected endpoints in `server/index.js`
4. component smoke tests for `src/App.jsx` with mocked API data
5. regression tests for `useAgents` zone/meeting calculations extracted into pure helpers

## Manual QA Notes

Until tests exist, changes to these areas should be manually checked:

- office/world/chat view switching
- command dispatch to agents
- task creation/assignment/completion endpoints
- LLM status panel and fallback event rendering
- startup with and without local providers available

## Coverage Summary

Testing maturity is low. The project is still in demo/prototype territory from a verification standpoint, despite having meaningful backend logic.
