import * as React from 'react';
import { useAppState, getActiveItem } from '../../contexts/AppStateContext';
import { TerminalView } from './TerminalView';

export function CenterPane() {
  const { state } = useAppState();
  const activeItem = getActiveItem(state);

  // Render all terminals but only show the active one
  // This preserves terminal state when switching
  const terminals = state.terminals;

  if (terminals.length === 0) {
    return (
      <div className="pane-content center-empty">
        <p>Select or create a terminal</p>
      </div>
    );
  }

  // If active item is a file, show file view
  if (activeItem?.type === 'file') {
    return (
      <div className="pane-content file-view">
        <div className="file-placeholder">
          <p>File: {activeItem.item.name}</p>
          <p className="path">{activeItem.item.path}</p>
          <p className="hint">(Monaco Editor will be added in Phase 5)</p>
        </div>
      </div>
    );
  }

  // Show terminals (all rendered, only active visible)
  return (
    <div className="pane-content terminal-pane">
      {terminals.map(terminal => (
        <TerminalView
          key={terminal.id}
          terminalId={terminal.id}
          cwd={terminal.cwd}
          isActive={state.activeTerminalId === terminal.id && activeItem?.type === 'terminal'}
        />
      ))}
    </div>
  );
}
