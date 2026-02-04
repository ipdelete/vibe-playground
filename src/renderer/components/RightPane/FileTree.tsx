import React, { useState, useEffect, useCallback } from 'react';
import { FileTreeNode } from './FileTreeNode';

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileEntry[];
}

interface FileTreeProps {
  rootPath: string;
  onFileClick: (filePath: string) => void;
}

export const FileTree: React.FC<FileTreeProps> = ({ rootPath, onFileClick }) => {
  const [rootEntries, setRootEntries] = useState<FileEntry[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRoot = async () => {
      setLoading(true);
      setError(null);
      try {
        const entries = await window.electronAPI.fs.readDirectory(rootPath);
        setRootEntries(entries);
      } catch (err) {
        setError('Failed to load directory');
        console.error('Error loading directory:', err);
      } finally {
        setLoading(false);
      }
    };

    if (rootPath) {
      loadRoot();
      // Reset expanded dirs when root changes
      setExpandedDirs(new Set());
    }
  }, [rootPath]);

  const handleDirectoryToggle = useCallback((path: string, isExpanded: boolean) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (isExpanded) {
        next.add(path);
      } else {
        next.delete(path);
      }
      return next;
    });
  }, []);

  const loadChildren = useCallback(async (dirPath: string): Promise<FileEntry[]> => {
    try {
      return await window.electronAPI.fs.readDirectory(dirPath);
    } catch (err) {
      console.error('Error loading children:', err);
      return [];
    }
  }, []);

  if (loading) {
    return <div className="file-tree-loading">Loading...</div>;
  }

  if (error) {
    return <div className="file-tree-error">{error}</div>;
  }

  if (rootEntries.length === 0) {
    return <div className="file-tree-empty">Empty directory</div>;
  }

  return (
    <div className="file-tree">
      {rootEntries.map((entry) => (
        <FileTreeNode
          key={entry.path}
          entry={entry}
          level={0}
          onFileClick={onFileClick}
          onDirectoryToggle={handleDirectoryToggle}
          expandedDirs={expandedDirs}
          loadChildren={loadChildren}
        />
      ))}
    </div>
  );
};

export default FileTree;
