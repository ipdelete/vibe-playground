# Features

A detailed look at everything cmux offers.

## 🖥️ Multi-Workspace Management
- Open multiple workspaces, each scoped to a different directory/repository
- Full PTY support via node-pty — TUI apps like `vim`, `htop`, and GitHub Copilot CLI work perfectly
- Workspace state preserved when switching between views
- Quick switching between workspaces via the Navigator
- Session restore — workspaces, open files, and notes persist across restarts

## 🤖 Chat-Driven Agents
- Create agents from Copilot Chat: "Create an agent for ~/src/my-project"
- Agents appear in the Navigator with a copilot icon and live status dot
- **Activity feed** — card-based UI showing tool calls, file reads, edits, and results
- Agent work is scoped to a local repo folder via `workingDirectory`
- Send follow-up tasks: "Now run the tests and fix anything that breaks"
- Manage multiple agents simultaneously across different repositories

## 💬 Copilot Chat
- Integrated GitHub Copilot chat powered by `@github/copilot-sdk`
- Multiple conversations with automatic naming from first message
- Streamed responses displayed in real-time
- Conversations persisted to disk and restored on restart
- Manage conversations in the right pane — create, switch, rename, and delete
- Each conversation gets its own isolated AI context

## 📁 Integrated File Browser
- File tree in the Explorer showing the current workspace's working directory
- Expandable folders with lazy loading
- Click files to view them with syntax highlighting

## ✨ Monaco Editor Integration
- View files with full syntax highlighting powered by Monaco Editor (VS Code's editor)
- Support for TypeScript, JavaScript, JSON, Markdown, CSS, HTML, Python, YAML, and more
- Line numbers and minimap navigation

## 🔀 Git Integration
- Worktree detection — workspaces in git worktrees show a badge in the Navigator
- File-level git status (modified, staged, untracked) reflected in the Explorer
- Automatic status refresh when files change on disk

## 📝 Scratch Pad
- Per-workspace notepad for jotting down notes, commands, or context
- Toggle with `Ctrl+J`
- Notes persist across sessions

## 🎨 Three-Pane Layout
- **Navigator** (left): Workspaces, agents, and open files
- **Main View** (center): Active workspace terminal, agent activity feed, file viewer, or chat
- **Explorer / Conversations** (right): File tree or conversation list, depending on mode

## 🔄 Auto-Updates
- Automatic update checks on startup
- Background downloads with progress indicator
- Non-disruptive updates — install on next restart
- Toast notifications for update status
