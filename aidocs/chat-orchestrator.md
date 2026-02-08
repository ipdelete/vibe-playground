# Chat Orchestrator: SDK-Driven Agents

## Overview

The chat orchestrator unifies Vibe Playground's two core features — terminal agents and Copilot chat — into a single workflow where **chat is the control plane** and **agents are the workers**. You tell chat what you want done, it creates agents scoped to local repos, and you watch the work happen in a live activity feed.

## User Flow

### 1. Start in Chat
Open Copilot Chat from the left pane and describe what you want:

> Create an agent for ~/src/giant-computer/pallet and fix the broken auth middleware

### 2. Agent Appears
Chat calls `create_agent` behind the scenes. A new agent named "pallet" appears in the left pane with:
- A **copilot icon** (distinguishing it from manual terminal agents)
- A **status dot** — green (idle), yellow pulsing (working), red (error)

### 3. Watch the Activity Feed
Click the agent in the left pane. The center pane shows a **card-based activity feed** instead of a terminal:
- **Tool start cards** — "Reading file", "Editing file", "Running command" with a spinner
- **Tool complete cards** — collapsible results, green for success, red for failure
- **Assistant message cards** — the agent's reasoning
- **Error cards** — red alerts
- **Done card** — green confirmation when the session goes idle

### 4. Send Follow-Up Tasks
Back in chat:
> Now run the tests and fix anything that breaks

Chat calls `send_to_agent` and the activity feed lights up again.

### 5. Multiple Agents
> Create an agent for ~/src/giant-computer/api and update the endpoints

A second agent appears. Click between them to see each feed. The file tree on the right shows the selected agent's repo.

### 6. Check Status
> List my agents

Chat calls `list_agents` and reports all agents with their current state.

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                   MAIN PROCESS                        │
│                                                        │
│  SdkLoader (shared)                                    │
│       │── Single CopilotClient instance                │
│       │── ESM dynamic import workaround                │
│       │                                                │
│  CopilotService (chat orchestrator)                    │
│       │── Uses shared client                           │
│       │── Registers orchestrator tools                 │
│       │── Streams chat responses to renderer           │
│       │                                                │
│  OrchestratorTools                                     │
│       │── create_agent: validate path → create session │
│       │── send_to_agent: forward prompt to agent       │
│       │── list_agents: report all agents               │
│       │                                                │
│  AgentSessionService                                   │
│       │── SDK sessions Map<agentId, CopilotSession>    │
│       │── Event mapping (SDK → AgentEvent)             │
│       │── Permission request forwarding                │
│       │                                                │
│  AgentService (existing PTY terminals)                 │
│       │── Still available for manual terminal agents   │
└───────┼────────────────────────────────────────────────┘
        │ IPC events
        ▼
┌──────────────────────────────────────────────────────┐
│                   RENDERER                             │
│                                                        │
│  LeftPane: agents with copilot icon + status dots      │
│  CenterPane:                                           │
│    AgentActivityView ← card-based event feed           │
│    AgentView ← raw terminal (for non-SDK agents)       │
│    ChatView ← orchestrator chat                        │
│  RightPane: file tree (unchanged)                      │
│                                                        │
│  State: agentEvents kept in memory, NOT persisted      │
└──────────────────────────────────────────────────────┘
```

## How It Works Under the Hood

### The SDK Connection
The `@github/copilot-sdk` communicates with Copilot CLI via JSON-RPC. A single `CopilotClient` is shared between the chat service and all agent sessions via `SdkLoader`. The SDK manages the CLI process lifecycle automatically.

### Chat → Agent Tool Flow
1. User sends a message in ChatView
2. `CopilotService.sendMessage()` forwards it to the SDK session
3. The SDK session has 3 custom tools registered (`create_agent`, `send_to_agent`, `list_agents`)
4. When the LLM decides to call `create_agent({path: "~/src/pallet"})`:
   - `OrchestratorTools` validates the path exists
   - `AgentSessionService.createSession()` creates a new SDK session with `workingDirectory` set to the repo
   - The `orchestrator:agent-created` IPC event fires
   - Renderer adds the agent to state with `hasSession: true`
5. When the LLM calls `send_to_agent({agentId, prompt})`:
   - `AgentSessionService.sendPrompt()` sends the prompt to the agent's session
   - The agent's SDK session starts making tool calls (edit, bash, etc.)
   - Each tool call fires SDK events → `AgentSessionService` maps them to `AgentEvent` types → IPC `agent-session:event` → renderer dispatches to `agentEvents` state

### SDK Event Mapping
The SDK emits rich events that are mapped to `AgentEvent` types:

| SDK Event | AgentEvent | UI Card |
|-----------|-----------|---------|
| `tool.execution_start` | `tool-start` | Spinner + tool name + args |
| `tool.execution_complete` | `tool-complete` | Collapsible result (success/failure) |
| `tool.execution_progress` | `tool-progress` | (transient, not rendered) |
| `tool.execution_partial_result` | `tool-partial-result` | (transient, not rendered) |
| `assistant.message` | `assistant-message` | Assistant reasoning card |
| `assistant.message_delta` | `assistant-delta` | (accumulated into message) |
| `session.error` | `error` | Red alert card |
| `session.idle` | `session-idle` | Green "Done" card |
| `subagent.started` | `subagent-started` | Sub-agent card with spinner |
| `subagent.completed` | `subagent-completed` | Sub-agent success card |
| `subagent.failed` | `subagent-failed` | Sub-agent error card |

### State Management
- `Agent.hasSession` — distinguishes SDK agents from PTY terminal agents
- `Agent.status` — `idle` / `working` / `error`, updated automatically from events
- `AppState.agentEvents` — `Record<string, AgentEvent[]>`, kept in memory only (not persisted to `session.json` to avoid bloat)
- `Agent.hasSession` IS persisted — so session restore knows to skip PTY creation

### CenterPane Routing
```
viewMode === 'chat'                    → ChatView
viewMode === 'agents' + hasSession     → AgentActivityView
viewMode === 'agents' + !hasSession    → AgentView (terminal)
activeItem is file                     → FileView
```

### Permission Handling
The SDK's `onPermissionRequest` callback forwards requests from the agent session to the renderer via IPC. The renderer can show approval UI in the activity feed and send the decision back. Currently auto-approves (Phase 5 will add the UI).

## Key Files

| File | Purpose |
|------|---------|
| `src/main/services/SdkLoader.ts` | Singleton CopilotClient, ESM import workaround |
| `src/main/services/CopilotService.ts` | Chat session management, tool registration |
| `src/main/services/OrchestratorTools.ts` | `create_agent`, `send_to_agent`, `list_agents` tool definitions |
| `src/main/services/AgentSessionService.ts` | Per-agent SDK sessions, event mapping, permission forwarding |
| `src/main/ipc/copilot.ts` | Chat IPC + lazy tool initialization |
| `src/main/ipc/agent-session.ts` | Agent session IPC (create/send/stop/destroy/events) |
| `src/shared/types.ts` | `AgentEvent` union type (12 variants), `Agent.hasSession/status` |
| `src/renderer/components/CenterPane/AgentActivityView.tsx` | Card-based activity feed UI |
| `src/renderer/contexts/AppStateContext.tsx` | Reducer actions for agent events/status |
| `src/preload.ts` | `agentSession` API bridge + `onAgentCreated` listener |
