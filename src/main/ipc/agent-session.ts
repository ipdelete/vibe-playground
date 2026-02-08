import { ipcMain, BrowserWindow } from 'electron';
import { agentSessionService } from '../services/AgentSessionService';

export function setupAgentSessionIPC(mainWindow: BrowserWindow): void {
  // Route agent session events to renderer
  agentSessionService.onEvent((agentId, event) => {
    mainWindow.webContents.send('agent-session:event', agentId, event);
  });

  // Route permission requests to renderer and wait for response
  agentSessionService.onPermissionRequest(async (agentId, request) => {
    return new Promise((resolve) => {
      const channel = `agent-session:permission-response:${agentId}:${request.toolCallId ?? Date.now()}`;

      // Listen for the renderer's decision
      ipcMain.handleOnce(channel, (_event, decision: 'approved' | 'denied') => {
        return decision;
      });

      // Send request to renderer
      mainWindow.webContents.send('agent-session:permission-request', agentId, {
        toolCallId: request.toolCallId,
        kind: request.kind,
      });

      // Also set up a direct response handler
      const responseHandler = (_event: Electron.IpcMainInvokeEvent, responseAgentId: string, toolCallId: string, decision: string) => {
        if (responseAgentId === agentId) {
          ipcMain.removeHandler('agent-session:permission-respond');
          resolve({
            kind: decision === 'approved' ? 'approved' : 'denied-interactively-by-user' as const,
          });
        }
      };

      // Remove old handler if exists, then add new one
      try { ipcMain.removeHandler('agent-session:permission-respond'); } catch { /* noop */ }
      ipcMain.handle('agent-session:permission-respond', responseHandler);
    });
  });

  ipcMain.handle('agent-session:create', async (_event, agentId: string, cwd: string, model?: string) => {
    await agentSessionService.createSession(agentId, cwd, model);
  });

  ipcMain.handle('agent-session:send', async (_event, agentId: string, prompt: string) => {
    await agentSessionService.sendPrompt(agentId, prompt);
  });

  ipcMain.handle('agent-session:stop', async (_event, agentId: string) => {
    await agentSessionService.stopAgent(agentId);
  });

  ipcMain.handle('agent-session:destroy', async (_event, agentId: string) => {
    await agentSessionService.destroySession(agentId);
  });
}
