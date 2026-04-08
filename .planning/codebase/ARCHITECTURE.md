# Architecture

## High-Level Shape

The codebase has a clear two-part architecture:

1. React client for the visual office simulation in `src/`
2. Node HTTP bridge for agent orchestration and LLM access in `server/`

The app is effectively a local control panel over a file-backed multi-agent system.

## Frontend Architecture

Primary composition happens in `src/App.jsx`:

- top-level view state chooses between `WorldView`, `OfficeView`, and `OfficeChatView`
- shared state is hoisted into hooks
- the same agent list is enriched with meeting state before being passed downward
- operational panels are grouped into `Toolbar`, `AgentBar`, and `OpsDock`

State hooks:

- `src/hooks/useAgents.js`: source of truth for agent list, zones, animation, and meeting-aware positions
- `src/hooks/useMeeting.js`: meeting state and transitions
- `src/hooks/useLLMStatus.js`: backend polling for LLM status
- `src/hooks/useTasks.js`: task board data
- `src/hooks/useEvents.js`: log/activity feed
- `src/hooks/useChat.js`: chat stream abstraction
- `src/hooks/useCommandCenter.js`: command submission and command history

Component style:

- container-heavy composition with props drilling from `App.jsx`
- domain UI split by panels rather than route-based pages
- animation and spatial logic are implemented inside hooks instead of a separate state machine

## Backend Architecture

The backend starts from `server/index.js` and wires together:

- `LLMRouter`
- `TelemetryService`
- `TaskQueue`
- `CEOAgent`
- `AgentManager`
- chat routing helpers
- prompt loader

The backend is a monolithic process with explicit objects rather than framework middleware layers.

## Agent Runtime Model

Agent orchestration flow:

1. `TelemetryService` loads current agent status from `../agents/status.json`
2. `AgentManager.bootstrap()` instantiates autonomous agents from registry data
3. `CEOAgent` runs its own decision loop
4. worker agents run staggered autonomous loops
5. command/chat endpoints trigger immediate work or direct completions
6. `TelemetryService` and `TaskQueue` sync mutable runtime state back to `status.json`

Key files:

- `server/agents/agent-manager.js`
- `server/agents/agent-registry.js`
- `server/agents/base-agent.js`
- `server/agents/ceo-agent.js`
- `server/agents/coding-agent.js`
- `server/agents/hr-agent.js`
- `server/agents/qa-agent.js`
- `server/agents/social-agent.js`
- `server/agents/work-agent.js`

## Data Flow

Frontend data flow:

1. browser polls `/api/agents/status`, `/api/events`, `/api/llm/status`, and history endpoints
2. hooks normalize and enrich server payloads
3. views render spatial or chat-oriented representations
4. command actions post back to `/api/agents/command` or chat endpoints

Backend data flow:

1. provider detection happens on startup
2. LLM-backed agents call `LLMRouter`
3. runtime effects become telemetry events
4. state snapshots are persisted to shared JSON files
5. frontend repolls and re-renders

## Entry Points

- Frontend boot: `src/main.jsx`
- Frontend app shell: `src/App.jsx`
- Backend boot: `server/index.js`
- LLM prompt assembly: `server/llm/prompt-loader.js`

## Architectural Strengths

- readable explicit wiring
- clear split between UI and bridge API
- strong domain naming around agents, meetings, zones, and commands
- local-first architecture is easy to run and reason about

## Architectural Constraints

- persistence, orchestration, and workspace structure are coupled
- backend has many responsibilities in one file (`server/index.js`)
- React state model is centralized in props rather than a dedicated store
- no formal schema layer exists between persisted JSON, runtime objects, and API payloads

## Build Order Implications

For future planning, dependency order is roughly:

1. shared data contracts around status/events/tasks
2. backend service extraction and endpoint stabilization
3. frontend state/hook cleanup around polling and animation
4. real agent intelligence and durable integrations

The current architecture supports iterative evolution, but scale work should start with data-contract hardening and backend decomposition.
