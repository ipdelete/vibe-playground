import React, { useState } from 'react';

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileEntry[];
}

interface FileTreeNodeProps {
  entry: FileEntry;
  level: number;
  onFileClick: (path: string) => void;
  onDirectoryToggle: (path: string, isExpanded: boolean) => void;
  expandedDirs: Set<string>;
  loadChildren: (path: string) => Promise<FileEntry[]>;
}

export const FileTreeNode: React.FC<FileTreeNodeProps> = ({
  entry,
  level,
  onFileClick,
  onDirectoryToggle,
  expandedDirs,
  loadChildren,
}) => {
  const [children, setChildren] = useState<FileEntry[]>(entry.children || []);
  const [loading, setLoading] = useState(false);
  const isExpanded = expandedDirs.has(entry.path);

  const handleClick = async () => {
    if (entry.isDirectory) {
      if (!isExpanded && children.length === 0) {
        setLoading(true);
        const loadedChildren = await loadChildren(entry.path);
        setChildren(loadedChildren);
        setLoading(false);
      }
      onDirectoryToggle(entry.path, !isExpanded);
    } else {
      onFileClick(entry.path);
    }
  };

  const indent = level * 16;
  const icon = entry.isDirectory 
    ? (isExpanded ? '📂' : '📁') 
    : getFileIcon(entry.name);

  return (
    <div>
      <div
        className="file-tree-node"
        style={{ paddingLeft: `${indent}px` }}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      >
        <span className="file-icon">{icon}</span>
        <span className="file-name">{entry.name}</span>
        {loading && <span className="loading">...</span>}
      </div>
      {entry.isDirectory && isExpanded && (
        <div className="file-tree-children">
          {children.map((child) => (
            <FileTreeNode
              key={child.path}
              entry={child}
              level={level + 1}
              onFileClick={onFileClick}
              onDirectoryToggle={onDirectoryToggle}
              expandedDirs={expandedDirs}
              loadChildren={loadChildren}
            />
          ))}
        </div>
      )}
    </div>
  );
};

function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
      return '🔷';
    case 'js':
    case 'jsx':
      return '🟨';
    case 'json':
      return '📋';
    case 'md':
      return '📝';
    case 'css':
      return '🎨';
    case 'html':
      return '🌐';
    case 'gitignore':
      return '🙈';
    default:
      return '📄';
  }
}

export default FileTreeNode;
