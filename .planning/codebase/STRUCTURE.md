# Structure

## Repository Layout

Top-level directories:

- `src/`: React application
- `server/`: Node bridge API and autonomous agent runtime
- `public/`: static browser assets
- `docs/`: ADRs and technical notes
- `dist/`: frontend build output

Top-level files:

- `package.json`
- `vite.config.js`
- `tailwind.config.js`
- `eslint.config.js`
- `postcss.config.js`
- `README.md`

## Frontend Structure

Entry and global styles:

- `src/main.jsx`
- `src/App.jsx`
- `src/index.css`
- `src/App.css`

Views:

- `src/views/WorldView.jsx`
- `src/views/OfficeView.jsx`
- `src/views/OfficeChatView.jsx`

Components:

- `src/components/Toolbar.jsx`
- `src/components/AgentBar.jsx`
- `src/components/OpsDock.jsx`
- `src/components/TaskBoard.jsx`
- `src/components/ChatPanel.jsx`
- `src/components/LogPanel.jsx`
- `src/components/MeetingPanel.jsx`
- `src/components/CommandDesk.jsx`
- `src/components/LLMIndicator.jsx`
- `src/components/SoundSettings.jsx`
- `src/components/ZoneMap.jsx`
- `src/components/AgentDot.jsx`
- `src/components/AgentTooltip.jsx`
- `src/components/PixelPortrait.jsx`
- `src/components/StatusBadge.jsx`
- `src/components/ActivityBar.jsx`

Hooks:

- `src/hooks/useAgents.js`
- `src/hooks/useMeeting.js`
- `src/hooks/useTasks.js`
- `src/hooks/useEvents.js`
- `src/hooks/useChat.js`
- `src/hooks/useLLMStatus.js`
- `src/hooks/useCommandCenter.js`
- `src/hooks/useViewport.js`

Utilities:

- `src/utils/api.js`
- `src/utils/pixelSounds.js`
- `src/utils/agentPersona.js`
- `src/utils/agentPrompts.js`

## Backend Structure

API and config:

- `server/index.js`
- `server/config.js`

Service layer:

- `server/services/telemetry-service.js`
- `server/services/task-queue.js`
- `server/services/openclaw-bridge.js`

Agent layer:

- `server/agents/base-agent.js`
- `server/agents/agent-registry.js`
- `server/agents/agent-manager.js`
- `server/agents/ceo-agent.js`
- `server/agents/coding-agent.js`
- `server/agents/hr-agent.js`
- `server/agents/qa-agent.js`
- `server/agents/social-agent.js`
- `server/agents/work-agent.js`

LLM layer:

- `server/llm/llm-router.js`
- `server/llm/prompt-loader.js`
- `server/llm/system-prompts/`

Backend helpers:

- `server/lib/http.js`
- `server/lib/chat-router.js`

## Naming Patterns

- React files use PascalCase for components and views
- hooks use `useX` naming
- backend services use kebab-case filenames
- agent IDs are domain-oriented (`coding`, `hr`, `qa-contract-01`, `social`, `work`, `ceo`)

## Organizational Observations

- frontend organization is feature-adjacent, but still mostly by technical type
- backend organization is better separated by responsibility
- docs are lightweight and focused on LLM serving direction
- test directories are absent

## Non-Repo Dependencies

Critical structure assumption:

- this repo expects a sibling directory named `agents` one level up
- several backend behaviors break if the workspace is moved without that sibling

## Best Places To Start Reading

For onboarding:

1. `README.md`
2. `src/App.jsx`
3. `src/hooks/useAgents.js`
4. `server/index.js`
5. `server/llm/llm-router.js`
6. `server/services/telemetry-service.js`

That sequence gives the fastest view of product behavior, runtime flow, and external coupling.
