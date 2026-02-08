// Shared SDK loader — singleton CopilotClient for use by CopilotService and AgentSessionService.
// Loads @github/copilot-sdk from the global npm install rather than bundling it,
// since the SDK is ESM-only and spawns @github/copilot as a child process —
// both need to live on the real filesystem, not inside asar.

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { pathToFileURL } from 'url';

type CopilotClientType = import('@github/copilot-sdk').CopilotClient;

let sdkModule: typeof import('@github/copilot-sdk') | null = null;
let clientInstance: CopilotClientType | null = null;
let startPromise: Promise<CopilotClientType> | null = null;

function getGlobalNodeModules(): string {
  // Check common locations first before shelling out
  const homeDir = os.homedir();
  const candidates = [
    path.join(homeDir, '.local', 'lib', 'node_modules'),
    path.join(homeDir, '.npm-global', 'lib', 'node_modules'),
    '/usr/local/lib/node_modules',
    '/usr/lib/node_modules',
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, '@github', 'copilot-sdk', 'package.json'))) {
      return dir;
    }
  }
  // Fallback: ask npm
  const npmRoot = execSync('npm root -g', { encoding: 'utf-8' }).trim();
  if (fs.existsSync(path.join(npmRoot, '@github', 'copilot-sdk', 'package.json'))) {
    return npmRoot;
  }
  throw new Error(
    '@github/copilot-sdk is not installed globally. Run: npm install -g @github/copilot-sdk'
  );
}

export async function loadSdk(): Promise<typeof import('@github/copilot-sdk')> {
  if (!sdkModule) {
    const globalModules = getGlobalNodeModules();
    const sdkEntry = path.join(globalModules, '@github', 'copilot-sdk', 'dist', 'index.js');
    // Use new Function to hide import() from webpack's static analysis,
    // but point it at the real filesystem path via pathToFileURL
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    sdkModule = await (new Function('url', 'return import(url)')(pathToFileURL(sdkEntry).href) as Promise<typeof import('@github/copilot-sdk')>);
  }
  return sdkModule;
}

export async function getSharedClient(): Promise<CopilotClientType> {
  if (clientInstance) return clientInstance;

  // Prevent concurrent start() calls
  if (startPromise) return startPromise;

  startPromise = (async () => {
    const { CopilotClient } = await loadSdk();
    const logDir = path.join(os.homedir(), '.copilot', 'logs');
    fs.mkdirSync(logDir, { recursive: true });
    clientInstance = new CopilotClient({
      logLevel: 'all',
      cliArgs: ['--log-dir', logDir],
    });
    await clientInstance.start();
    return clientInstance;
  })();

  try {
    const client = await startPromise;
    return client;
  } catch (err) {
    // Reset state so next call retries instead of returning broken client
    clientInstance = null;
    throw err;
  } finally {
    startPromise = null;
  }
}

export async function stopSharedClient(): Promise<void> {
  if (clientInstance) {
    await clientInstance.stop().catch(() => {});
    clientInstance = null;
  }
}
