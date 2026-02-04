import * as React from 'react';
import { useAppState, getActiveTerminal } from '../../contexts/AppStateContext';
import { FileTree } from './FileTree';

interface RightPaneProps {
  onFileClick: (filePath: string, fileName: string) => void;
}

export function RightPane({ onFileClick }: RightPaneProps) {
  const { state } = useAppState();
  const activeTerminal = getActiveTerminal(state);

  const handleFileClick = (filePath: string) => {
    // Extract filename from path
    const fileName = filePath.split(/[/\\]/).pop() || filePath;
    onFileClick(filePath, fileName);
  };

  if (!activeTerminal) {
    return (
      <>
        <div className="pane-header">
          <span>Files</span>
        </div>
        <div className="pane-content">
          <p className="empty-message">No directory selected</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="pane-header">
        <span>Files</span>
      </div>
      <div className="pane-content file-tree-container">
        <FileTree 
          rootPath={activeTerminal.cwd} 
          onFileClick={handleFileClick}
        />
      </div>
    </>
  );
}
