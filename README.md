# Agent Office Visual React

Painel visual em React para simular um escritorio multi-agente, com mapa de zonas, reuniao, chat, feed de eventos e quadro de tarefas.

## Estado Atual

O projeto esta funcional como demo visual.

- `OfficeView` e `WorldView` renderizam os agentes no mapa
- `OfficeView` agora usa um layout espacial com salas, corredores, hotspots e mesa central de reuniao
- `TaskBoard`, `ChatPanel` e `LogPanel` funcionam com dados simulados
- o botao `CHAMAR TODOS` move os agentes para a sala de reuniao
- pan e zoom do `OfficeView` funcionam com estrutura de 3 camadas
- SFX retro gerados via Web Audio API foram adicionados para eventos principais
- `SoundSettings` na toolbar controla master volume, categorias e BGM opcional
- existe um bridge backend local para expor agentes reais, eventos e status de LLM
- build de producao validado com `cmd /c npm run build`

## Limitacoes Atuais

- os agentes ainda nao tem inteligencia real
- chat, tarefas e eventos sao simulados no frontend
- o comportamento do CEO ainda e principalmente visual
- a UX esta funcional, mas ainda nao esta 100% polida
- falta validacao visual manual mais cuidadosa para drag, zoom e reuniao
- falta validacao manual completa dos sons no navegador e do BGM via Tone.js CDN
- fallback cloud OpenAI -> MiniMax nao foi validado neste ambiente por falta de credenciais

## Arquitetura Atual

### Fonte de verdade

O estado principal foi centralizado em `src/App.jsx`.

- `useAgents()` vive no topo da app
- `useMeeting()` vive no topo da app
- `WorldView` e `OfficeView` recebem `agents`, `agentPositions` e `meeting` por props
- `MeetingPanel` e `LogPanel` consomem esse estado compartilhado

Isso corrige um problema anterior em que componentes diferentes criavam hooks separados e passavam a operar com estados divergentes.

### Views

- `src/views/OfficeView.jsx`
  - viewport externo com `overflow: hidden`
  - camada intermediaria com `transform` para pan e zoom
  - mapa espacial com salas, corredores, decor e HUD minima
  - zoom ancorado no cursor
  - drag global via listeners em `window`
- `src/views/WorldView.jsx`
  - usa `ZoneMap` para visualizacao mais simples

### Hooks

- `src/hooks/useAgents.js`
  - polling de `agents/status.json`
  - resolve zona por status/time/role
  - calcula posicoes por zona
  - anima movimento com `requestAnimationFrame`
- `src/hooks/useMeeting.js`
  - controla entrada e saida de agentes da reuniao
- `src/hooks/useTasks.js`
  - simula tarefas
- `src/hooks/useChat.js`
  - simula chat entre agentes
- `src/hooks/useEvents.js`
  - alimenta o feed visual de atividade

## Componentes Principais

- `src/components/AgentDot.jsx`: sprite e tooltip dos agentes
- `src/components/ZoneMap.jsx`: grid de zonas no modo world
- `src/components/MeetingPanel.jsx`: controle de reuniao
- `src/components/LogPanel.jsx`: activity feed lateral
- `src/components/TaskBoard.jsx`: quadro de tarefas
- `src/components/ChatPanel.jsx`: chat entre agentes
- `src/components/SoundSettings.jsx`: dropdown de configuracao de audio
- `src/components/LLMIndicator.jsx`: status visual das LLMs na toolbar

## Audio

- `src/utils/pixelSounds.js`
  - engine singleton de audio
  - `AudioContext` reutilizado para evitar vazamento e latencia desnecessaria
  - persistencia em `localStorage` na chave `soundSettings`
  - categorias:
    - movement
    - ui
    - notifications
    - meetings
  - BGM opcional usando `window.Tone` carregado por CDN em `index.html`

- eventos com SFX:
  - mudanca de zona do agente
  - conclusao de tarefa
  - nova mensagem no chat
  - inicio e fim de meeting
  - hover e clique em botoes principais
  - entrada do CEO em zona

## Backend Bridge

- `server/index.js`
  - API local para o frontend
- `server/llm/llm-router.js`
  - detecta provedores
  - define prioridade
  - aplica fallback automatico
  - conta chamadas por LLM
- `server/services/telemetry-service.js`
  - adapta `../agents/status.json` e `../agents/events.json`
  - injeta `llm_provider`
  - mantem eventos runtime, incluindo fallback
- `server/agents/ceo-agent.js`
  - CEO autonomo via LLM router
  - endpoint manual `POST /api/ceo/run-now`

### Endpoints

- `GET /api/health`
- `GET /api/agents/status`
- `GET /api/events`
- `GET /api/llm/status`
- `POST /api/llm/set-primary`
- `POST /api/llm/test`
- `POST /api/ceo/run-now`

## Proximas Frentes

- adicionar inteligencia real aos agentes
- conectar tasks/chat/events a backend real
- polir UX de movimentacao e interacoes visuais
- evoluir o novo mapa espacial para pathing real, hotspots semanticos e reunioes fisicas
- definir comportamento real do CEO no mapa
- revisar colisao e spacing de agentes em todos os estados
- validar manualmente os sons e ajustar mixagem fina

## Comandos

```bash
npm run dev
npm run api
cmd /c npm run build
```

## Observacao

Se o build falhar no PowerShell por policy de script, usar `cmd /c npm run build`.
