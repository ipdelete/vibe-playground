import * as React from 'react';
import { useAppState, getActiveItem } from '../../contexts/AppStateContext';
import { TerminalView } from './TerminalView';
import { FileView } from './FileView';

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
      <div className="pane-content file-view-pane">
        <FileView 
          filePath={activeItem.item.path}
          fileName={activeItem.item.name}
        />
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
