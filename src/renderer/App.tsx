import * as React from 'react';
import { AppStateProvider } from './contexts/AppStateContext';
import { ThreePaneLayout } from './components/Layout';
import { LeftPane } from './components/LeftPane';
import { CenterPane } from './components/CenterPane';
import { RightPane } from './components/RightPane';
import { useAppState } from './contexts/AppStateContext';

function AppContent() {
  const { state, dispatch } = useAppState();

  const handleAddTerminal = async () => {
    const directory = await window.electronAPI.openDirectory();
    if (directory) {
      const id = `term-${Date.now()}`;
      const label = directory.split(/[/\\]/).pop() || 'Terminal';
      dispatch({
        type: 'ADD_TERMINAL',
        payload: { id, label, cwd: directory },
      });
    }
  };

  const handleCloseTerminal = (terminalId: string) => {
    window.electronAPI.terminal.kill(terminalId);
    dispatch({ type: 'REMOVE_TERMINAL', payload: { id: terminalId } });
  };

  const handleFileClick = (filePath: string, fileName: string) => {
    // Will be implemented in Phase 5
  };

  return (
    <ThreePaneLayout
      leftPane={
        <LeftPane
          onAddTerminal={handleAddTerminal}
          onCloseTerminal={handleCloseTerminal}
        />
      }
      centerPane={<CenterPane />}
      rightPane={<RightPane onFileClick={handleFileClick} />}
    />
  );
}

const App: React.FC = () => {
  return (
    <AppStateProvider>
      <AppContent />
    </AppStateProvider>
  );
};

export default App;
