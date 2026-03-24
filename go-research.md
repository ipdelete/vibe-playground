# cmux Go Rewrite Research

> Research notes from evaluating a native Go rewrite of cmux using Gio + libghostty + Copilot SDK.
> Date: 2026-03-24

## Motivation

cmux is currently an Electron app (TypeScript/React) using xterm.js for terminal rendering and node-pty for shell spawning. While functional, Electron carries ~200MB RAM overhead, IPC serialization on every keystroke, and DOM rendering for what is fundamentally a character grid. For a terminal-centered workspace manager, a native stack is a better fit.

### Why not stay with Electron?

- Terminal is the core product, not a peripheral feature
- IPC between main/renderer processes adds latency to every keystroke and render
- xterm.js bundles its own VT parser — good but not best-in-class
- ~200MB baseline memory for Chromium runtime

### Why not Rust?

- No official Copilot SDK for Rust (only a community tech preview: [copilot-sdk-rust](https://github.com/copilot-community-sdk/copilot-sdk-rust))
- Community SDK uses JSON-RPC over stdio — functional but unsupported
- Would need to build/maintain unofficial bindings

## Chosen Stack

| Layer | Technology | Role |
|-------|-----------|------|
| **GUI** | [Gio](https://gioui.org/) | Immediate-mode GPU-accelerated UI toolkit |
| **Terminal emulation** | [libghostty-vt](https://github.com/ghostty-org/ghostty) | VT parsing, screen state, input encoding (via cgo) |
| **AI agents** | [Copilot SDK for Go](https://github.com/github/copilot-sdk) | Official GitHub Copilot agent integration |
| **PTY management** | [creack/pty](https://github.com/creack/pty) (Unix) / ConPTY (Windows) | Shell spawning and I/O |
| **Language** | Go 1.25+ | Backend, UI, everything |

## Component Deep Dives

### Gio

Gio is an immediate-mode GUI toolkit for Go with GPU-accelerated rendering.

**Why Gio over alternatives:**

| Toolkit | Pros | Cons | Verdict |
|---------|------|------|---------|
| **Gio** | Full custom rendering, GPU-native (Metal/D3D11/OpenGL/Vulkan), immediate mode, total control | No terminal widget, pre-1.0 API, fewer built-in widgets | Best fit for libghostty integration |
| **Fyne** | Built-in terminal widget, Tree/List widgets, Material Design | Uses own VT impl (not libghostty), less rendering control | Fastest to MVP but wrong terminal story |
| **Wails** | Rich web UI, lightweight vs Electron (~5MB binary, ~40MB RAM) | Still web rendering (xterm.js), doesn't escape webview paradigm | Lighter Electron, not a paradigm shift |
| **gogpu/ui** | Pure Go, zero CGO, GPU rendering, modern widget set | Brand new (v0.1.0, 2026), unproven, no terminal support | Too early |

**Gio platform support:**
- Windows: First-class, no cgo required (Direct3D 11 backend)
- macOS: Metal backend
- Linux: OpenGL/Vulkan
- Also: Android, iOS, FreeBSD, OpenBSD, WebAssembly (experimental)

**Key Gio concepts:**
- Immediate mode: UI tree recomputed every frame from current state
- Operation tree: each frame produces an op tree describing what to draw
- Custom rendering via `op/paint` and `op/clip` packages
- Vector graphics rendered directly on GPU (not texture-baked)

### libghostty-vt

libghostty-vt is the terminal emulation core extracted from [Ghostty](https://ghostty.org), exposing a C API. It handles VT sequence parsing, terminal state management, and renderer state — but contains no rendering or windowing code.

**What it provides:**
- SIMD-optimized VT parsing
- Terminal state (cells, cursor, styles, modes)
- Text reflow on resize
- Scrollback buffer management
- Key encoder (key events → VT escape sequences)
- Mouse encoder (mouse events → VT escape sequences)
- Render state API (iterate rows/cells, read graphemes, colors, styles)
- Focus event encoding
- 24-bit color, 256-color palette, bold/italic/inverse
- Kitty keyboard protocol
- Mouse tracking (X10, normal, button, any-event modes)

**What you provide:**
- Window/GUI framework (Gio)
- Renderer (draw glyphs from cell data)
- PTY / data transport
- Font loading and glyph measurement
- Resize events

**Integration via cgo:**
```go
// #cgo LDFLAGS: -lghostty-vt
// #include <ghostty/vt.h>
import "C"
```

Use `bindgen`-style manual bindings or a Go wrapper package around the C API. The API uses opaque handles (`GhosttyTerminal`, `GhosttyKeyEncoder`, etc.) which map cleanly to Go types.

**Core API flow (from Ghostling reference):**
1. `ghostty_terminal_new()` — create terminal with cols/rows/scrollback
2. `ghostty_terminal_vt_write()` — feed PTY output bytes into parser
3. `ghostty_key_encoder_encode()` — convert key events to escape sequences
4. `ghostty_mouse_encoder_encode()` — convert mouse events to escape sequences
5. `ghostty_render_state_update()` — snapshot terminal state for rendering
6. Iterate rows → cells → read graphemes, fg/bg colors, styles → draw with Gio
7. `ghostty_terminal_resize()` — handle window resize (reflow is automatic)
8. `ghostty_terminal_free()` — cleanup

### Copilot SDK for Go

The official [GitHub Copilot SDK](https://github.com/github/copilot-sdk) has first-class Go support.

```
go get github.com/github/copilot-sdk/go
```

**Capabilities:**
- Multi-turn conversations
- Tool execution and registration
- Agent orchestration
- Real-time response streaming
- Model management and switching
- Custom tool/skill plugin system

**Requirements:**
- GitHub Copilot subscription
- Copilot CLI installed and authenticated

**Current cmux agent architecture to replicate:**
- Orchestrator with tools: `vp_create_agent`, `vp_send_to_agent`, `vp_list_agents`
- Per-workspace Copilot sessions scoped to working directories
- Permission request handling for tool execution

## Cross-Platform Status

| Component | Windows | macOS | Linux |
|-----------|---------|-------|-------|
| **Gio** | ✅ First-class (D3D11, no cgo) | ✅ Metal | ✅ OpenGL/Vulkan |
| **Copilot SDK (Go)** | ✅ Official | ✅ Official | ✅ Official |
| **libghostty-vt** | ⚠️ Not yet (community fork exists) | ✅ Stable | ✅ Stable |
| **PTY (creack/pty)** | ❌ Unix only | ✅ | ✅ |
| **PTY (ConPTY)** | ✅ Win10 1809+ | N/A | N/A |

### Windows Strategy

libghostty-vt's Windows support is expected but not yet in mainline (likely later 2026). The Ghostling README lists Windows as "could work but hasn't been tested." A community fork ([ghostty-windows](https://github.com/InsipidPoint/ghostty-windows)) using ConPTY exists.

**Recommended approach:** Abstract the terminal backend behind a Go interface from day one:

```go
type TerminalBackend interface {
    // Feed raw bytes from PTY into the VT parser
    Write(data []byte)

    // Resize the terminal grid
    Resize(cols, rows uint16)

    // Snapshot current state for rendering
    UpdateRenderState()

    // Iterate visible rows/cells for drawing
    IterateRows(fn func(row RowData))

    // Encode a key event into VT escape sequence bytes
    EncodeKey(event KeyEvent) []byte

    // Encode a mouse event into VT escape sequence bytes
    EncodeMouse(event MouseEvent) []byte

    // Query terminal state (cursor pos, modes, scrollbar, etc.)
    GetCursorState() CursorState
    GetScrollbar() ScrollbarState

    // Cleanup
    Close()
}
```

- **macOS/Linux:** Implement using libghostty-vt via cgo
- **Windows (interim):** Implement using a pure-Go VT parser (e.g., adapt from existing Go terminal libs) until libghostty Windows support ships
- **Windows (future):** Swap in libghostty-vt when available

The Gio rendering layer doesn't care — it just draws cells from whatever backend provides them.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Gio (GPU rendering)                 │
│  ┌──────────────┬──────────────────┬──────────────┐ │
│  │  Workspace   │    Terminal      │    File       │ │
│  │  Panel       │    (libghostty   │    Browser    │ │
│  │  (list of    │     cells → Gio  │    Panel      │ │
│  │   repos)     │     drawing)     │    (tree)     │ │
│  └──────────────┴──────────────────┴──────────────┘ │
├─────────────────────────────────────────────────────┤
│              Go backend (goroutines)                 │
│  ┌──────────────┬──────────────────┬──────────────┐ │
│  │  Copilot SDK │  PTY management  │  Filesystem   │ │
│  │  (agents,    │  (creack/pty or  │  watcher      │ │
│  │   sessions,  │   ConPTY)        │               │ │
│  │   tools)     │                  │               │ │
│  └──────────────┴──────────────────┴──────────────┘ │
├─────────────────────────────────────────────────────┤
│  libghostty-vt (cgo) — VT parse + terminal state    │
└─────────────────────────────────────────────────────┘
```

### Data Flow

```
User keypress
  → Gio input event
  → TerminalBackend.EncodeKey() [libghostty key encoder]
  → escape sequence bytes
  → write to PTY fd

Shell output
  → read from PTY fd (goroutine, non-blocking)
  → TerminalBackend.Write() [libghostty VT parser]
  → terminal state updated internally

Each frame (60fps)
  → TerminalBackend.UpdateRenderState()
  → TerminalBackend.IterateRows()
  → for each cell: read grapheme, fg/bg color, style flags
  → Gio op tree: draw background rect, draw text glyph
  → Gio submits to GPU
```

## Go Language Notes

Last used Go at 1.11–1.18. Key changes since then:

| Version | Notable Feature |
|---------|----------------|
| 1.18 | **Generics** (type parameters, constraints) |
| 1.21 | `min`/`max` builtins, `slog` structured logging, `slices`/`maps` packages |
| 1.22 | Range over integers (`for i := range 10`), loop variable scoping fix |
| 1.24 | Generic type aliases, Swiss Table maps (faster), improved `go vet` |
| 1.25 | Simplified generic constraints (core types removed), container-aware GOMAXPROCS, JSON v2 (experimental) |

Generics are now mature. The language still feels like Go — just with fewer workarounds needed.

## Reference Implementation

[Ghostling](https://github.com/ghostty-org/ghostling) is the canonical minimal libghostty-vt example:
- Single C file (~1200 lines)
- Uses Raylib for windowing/rendering (analogous to our Gio role)
- Demonstrates the complete integration: PTY spawn → VT parse → render state → draw cells
- Shows key encoding, mouse encoding, scrollbar, resize, focus events
- Heavy comments explaining every API call

## Key Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| libghostty Windows support delayed | Can't run native terminal on Windows | TerminalBackend interface allows fallback VT parser |
| Gio pre-1.0 API breaks | UI code churn | Pin Gio version, update deliberately |
| Building all widgets from scratch | Slow development | Start with terminal pane only, add side panes incrementally |
| cgo complicates cross-compilation | Build complexity | Gio is cgo-free on Windows; libghostty cgo only needed on platforms that support it |
| Copilot SDK still in tech preview | API changes | Already using it in cmux today; same risk as current Electron version |

## Next Steps

1. **Prototype:** Gio window with a single pane rendering a hardcoded text grid
2. **PTY integration:** Spawn a shell with creack/pty, read output into a buffer
3. **libghostty binding:** Create Go wrapper package for the C API
4. **Terminal rendering:** Feed PTY output → libghostty → iterate cells → draw with Gio
5. **Input handling:** Gio key/mouse events → libghostty encoders → write to PTY
6. **Copilot SDK:** Integrate agent sessions alongside terminal panes
7. **Side panes:** Workspace list (left), file browser tree (right)
8. **Windows:** ConPTY PTY backend + fallback VT parser until libghostty ships
