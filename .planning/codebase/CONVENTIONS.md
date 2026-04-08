# Conventions

## General Style

The project favors explicit JavaScript over abstraction-heavy patterns. Most conventions are enforced socially and by file shape rather than by strong tooling or type systems.

## Frontend Conventions

Observed patterns in `src/`:

- function components only
- hooks-based state management
- no Redux, Zustand, React Query, or router layer
- prop-driven composition from `src/App.jsx`
- inline style objects are used alongside Tailwind utility classes
- domain constants often live in the same file as the hook or component that uses them

Examples:

- `src/App.jsx` coordinates feature hooks and passes state via props
- `src/hooks/useAgents.js` keeps constants, helpers, polling, and animation loop in one file
- `src/main.jsx` uses a class-based React error boundary even though the rest of the app is functional

## Backend Conventions

Observed patterns in `server/`:

- native Node APIs instead of Express/Fastify
- classes for long-lived runtime services (`LLMRouter`, `TelemetryService`, `TaskQueue`, `AgentManager`)
- manual request routing via `if` chains in `server/index.js`
- JSON responses through helper `sendJson`
- in-memory runtime state with periodic persistence to JSON

## Naming

- components: PascalCase (`MeetingPanel`, `CommandDesk`)
- hooks: camelCase with `use` prefix (`useCommandCenter`)
- services/helpers: kebab-case filenames (`telemetry-service.js`, `chat-router.js`)
- constants: upper snake case (`POLL_MS`, `MEETING_SLOTS`, `ROLE_KEYWORDS`)

## Error Handling

Style is mixed:

- some code returns structured API errors with HTTP status codes in `server/index.js`
- several frontend hooks swallow errors silently, especially polling code
- backend services log failures to console rather than surfacing typed errors upward

Concrete example:

- `src/hooks/useAgents.js` catches fetch failures and ignores them
- `server/services/task-queue.js` and `server/services/telemetry-service.js` log sync failures but continue running

## State Management

Implicit conventions:

- React view state stays local unless shared by multiple panels
- shared visual state is hoisted into hooks in `App.jsx`
- backend runtime state lives in class instances and file-backed JSON snapshots

## Linting

Configured in `eslint.config.js`:

- JS recommended config
- React hooks rules
- React refresh rules
- `no-unused-vars` with exception pattern `^[A-Z_]`

Notably absent:

- TypeScript
- Prettier
- import ordering
- strict complexity rules

## Documentation Conventions

- practical README with current architecture and commands
- ADR format under `docs/adr/`
- operational notes in markdown under `docs/`

## Cross-Cutting Pattern

The strongest codebase convention is domain-driven naming around the office simulation:

- zones
- meetings
- agents
- command center
- telemetry

That vocabulary is consistent and useful. The weaker convention area is data contracts and defensive validation, where patterns vary file to file.
