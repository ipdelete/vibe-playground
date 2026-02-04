// Stub TerminalService - real node-pty implementation requires Spectre-mitigated libraries
// This provides a simulated terminal for development/testing purposes

import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as os from 'os';

interface TerminalInstance {
  id: string;
  process: ChildProcessWithoutNullStreams;
  cwd: string;
  dataCallback?: (data: string) => void;
  exitCallback?: (code: number) => void;
}

class TerminalService {
  private terminals: Map<string, TerminalInstance> = new Map();

  getDefaultShell(): string {
    if (os.platform() === 'win32') {
      return 'powershell.exe';
    }
    return process.env.SHELL || '/bin/bash';
  }

  create(id: string, cwd: string): string {
    const shell = this.getDefaultShell();
    
    // Use child_process.spawn as a fallback (no PTY features but functional)
    const proc = spawn(shell, [], {
      cwd,
      env: process.env as NodeJS.ProcessEnv,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const instance: TerminalInstance = {
      id,
      process: proc,
      cwd,
    };

    proc.stdout.on('data', (data: Buffer) => {
      instance.dataCallback?.(data.toString());
    });

    proc.stderr.on('data', (data: Buffer) => {
      instance.dataCallback?.(data.toString());
    });

    proc.on('close', (code) => {
      instance.exitCallback?.(code ?? 0);
      this.terminals.delete(id);
    });

    this.terminals.set(id, instance);
    return id;
  }

  write(id: string, data: string): void {
    const terminal = this.terminals.get(id);
    if (terminal) {
      terminal.process.stdin.write(data);
    }
  }

  resize(_id: string, _cols: number, _rows: number): void {
    // Resize not supported without PTY
  }

  kill(id: string): void {
    const terminal = this.terminals.get(id);
    if (terminal) {
      terminal.process.kill();
      this.terminals.delete(id);
    }
  }

  onData(id: string, callback: (data: string) => void): void {
    const terminal = this.terminals.get(id);
    if (terminal) {
      terminal.dataCallback = callback;
    }
  }

  onExit(id: string, callback: (exitCode: number) => void): void {
    const terminal = this.terminals.get(id);
    if (terminal) {
      terminal.exitCallback = callback;
    }
  }

  getTerminal(id: string): TerminalInstance | undefined {
    return this.terminals.get(id);
  }

  getAllTerminals(): string[] {
    return Array.from(this.terminals.keys());
  }
}

export const terminalService = new TerminalService();
