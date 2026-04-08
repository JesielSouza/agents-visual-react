# Concerns

## Primary Concerns

## 1. External workspace coupling

Core backend state depends on sibling files outside the repo:

- `server/config.js`
- `../agents/status.json`
- `../agents/events.json`

Impact:

- cloning only this repo is not enough to run the full system
- project portability is low
- failures in external JSON files can destabilize startup and runtime sync

## 2. Large monolithic server entrypoint

`server/index.js` owns:

- bootstrapping
- endpoint routing
- request parsing
- agent triggering
- chat orchestration
- task endpoints
- error formatting

Impact:

- endpoint changes are hard to isolate
- regression risk grows as features accumulate
- maintainability drops faster than feature count

## 3. Silent failure paths on the frontend

Example:

- `src/hooks/useAgents.js` swallows polling errors

Impact:

- network or backend failures can look like stale UI instead of explicit failures
- debugging user-reported issues becomes harder

## 4. No schema validation for persisted JSON

`TelemetryService` and `TaskQueue` read and write mutable JSON files directly.

Impact:

- malformed file content can propagate inconsistent state
- upgrades to status/event formats are risky
- runtime assumptions are undocumented in code

## 5. Testing deficit against growing complexity

The app now includes:

- animation state
- task lifecycle
- multi-agent command routing
- LLM fallback logic
- file-backed persistence

But there are still no automated tests.

Impact:

- refactors will be expensive
- hidden regressions are likely
- backend logic quality depends on manual discipline

## 6. Mixed UI state responsibilities

`src/App.jsx` is readable, but many hooks and panels depend on each other through broad prop passing.

Impact:

- feature growth may increase coupling between visual layers and operational state
- selection, command, meeting, logs, tasks, and chat can drift into coordination issues

## 7. Encoding and text normalization issues

Several backend responses show mojibake-like output in current reads, especially Portuguese accents.

Examples observed in:

- `server/index.js`
- `server/llm/llm-router.js`
- `server/services/task-queue.js`

Impact:

- operator-facing text quality degrades
- prompts and UI messages may become inconsistent
- indicates possible encoding handling issues in files or logs

## 8. Operational observability is console-heavy

The runtime logs heavily to console, but there is no structured logging sink, metrics pipeline, or health dashboard beyond API payloads.

Impact:

- diagnosing production-like incidents will be manual
- historical reasoning about provider failures is limited

## Risk Ranking

- High: external workspace coupling
- High: no automated tests
- High: monolithic `server/index.js`
- Medium: missing schema validation
- Medium: silent frontend failure handling
- Medium: encoding inconsistencies
- Medium: limited observability

## Suggested Mitigations

1. formalize schemas for `status.json`, `events.json`, chat history, and tasks
2. extract route modules from `server/index.js`
3. add a minimum automated test harness before more backend growth
4. surface degraded backend state in the UI instead of failing silently
5. reduce dependence on sibling workspace paths or make them configurable and validated at startup
