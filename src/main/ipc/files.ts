import { ipcMain } from 'electron';
import { fileService, FileEntry } from '../services/FileService';

export function setupFileIPC(): void {
  ipcMain.handle('fs:readDirectory', async (_event, dirPath: string): Promise<FileEntry[]> => {
    return fileService.readDirectory(dirPath);
  });

  ipcMain.handle('fs:readFile', async (_event, filePath: string): Promise<string> => {
    return fileService.readFile(filePath);
  });
}
