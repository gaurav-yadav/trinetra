// tmux Adapter - Functions to interact with tmux sessions

import { spawn } from 'child_process';

interface ExecResult {
  stdout: string;
  stderr: string;
  code: number;
}

/**
 * Execute a tmux command using spawn (no shell)
 */
async function execTmux(args: string[]): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn('tmux', args, { stdio: ['pipe', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      resolve({ stdout, stderr, code: code ?? 0 });
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Create a new tmux session
 */
export async function createSession(name: string, path: string): Promise<void> {
  const result = await execTmux(['new-session', '-d', '-s', name, '-c', path]);
  if (result.code !== 0) {
    throw new Error(`Failed to create tmux session: ${result.stderr}`);
  }
}

/**
 * List all tmux sessions, filtering for ccp_ prefixed ones
 */
export async function listSessions(): Promise<string[]> {
  const result = await execTmux(['list-sessions', '-F', '#{session_name}']);
  if (result.code !== 0) {
    // No sessions exist - handle various error messages
    const stderr = result.stderr.toLowerCase();
    if (
      stderr.includes('no server running') ||
      stderr.includes('no sessions') ||
      stderr.includes('error connecting') ||
      stderr.includes('no such file or directory')
    ) {
      return [];
    }
    throw new Error(`Failed to list tmux sessions: ${result.stderr}`);
  }

  return result.stdout
    .trim()
    .split('\n')
    .filter((name) => name.startsWith('ccp_'));
}

/**
 * List windows in a session
 */
export async function listWindows(session: string): Promise<Array<{ index: number; name: string }>> {
  const result = await execTmux(['list-windows', '-t', session, '-F', '#{window_index}:#{window_name}']);
  if (result.code !== 0) {
    throw new Error(`Failed to list windows: ${result.stderr}`);
  }

  return result.stdout
    .trim()
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => {
      const [indexStr, name] = line.split(':');
      return { index: parseInt(indexStr, 10), name };
    });
}

/**
 * List panes in a window
 */
export async function listPanes(
  session: string,
  window: number
): Promise<Array<{ index: number; id: string; active: boolean; currentPath: string }>> {
  const result = await execTmux([
    'list-panes',
    '-t',
    `${session}:${window}`,
    '-F',
    '#{pane_index}:#{pane_id}:#{pane_active}:#{pane_current_path}',
  ]);
  if (result.code !== 0) {
    throw new Error(`Failed to list panes: ${result.stderr}`);
  }

  return result.stdout
    .trim()
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => {
      const parts = line.split(':');
      const index = parseInt(parts[0], 10);
      const id = parts[1];
      const active = parts[2] === '1';
      const currentPath = parts.slice(3).join(':'); // Path may contain colons
      return { index, id, active, currentPath };
    });
}

/**
 * Send raw keys to a tmux target
 */
export async function sendKeys(target: string, keys: string): Promise<void> {
  const result = await execTmux(['send-keys', '-t', target, keys]);
  if (result.code !== 0) {
    throw new Error(`Failed to send keys: ${result.stderr}`);
  }
}

/**
 * Send a command (with Enter) to a tmux target
 */
export async function sendCommand(target: string, command: string): Promise<void> {
  const result = await execTmux(['send-keys', '-t', target, command, 'Enter']);
  if (result.code !== 0) {
    throw new Error(`Failed to send command: ${result.stderr}`);
  }
}

/**
 * Send interrupt (C-c) to a tmux target
 */
export async function sendInterrupt(target: string): Promise<void> {
  const result = await execTmux(['send-keys', '-t', target, 'C-c']);
  if (result.code !== 0) {
    throw new Error(`Failed to send interrupt: ${result.stderr}`);
  }
}

/**
 * Capture pane content
 */
export async function capturePane(target: string, lines: number = 2000): Promise<string> {
  const result = await execTmux(['capture-pane', '-t', target, '-p', '-S', `-${lines}`]);
  if (result.code !== 0) {
    throw new Error(`Failed to capture pane: ${result.stderr}`);
  }
  return result.stdout;
}

/**
 * Kill a tmux session
 */
export async function killSession(session: string): Promise<void> {
  const result = await execTmux(['kill-session', '-t', session]);
  if (result.code !== 0) {
    throw new Error(`Failed to kill session: ${result.stderr}`);
  }
}

/**
 * Setup pipe-pane to redirect output to a log file
 */
export async function pipePaneToFile(target: string, logPath: string): Promise<void> {
  const result = await execTmux(['pipe-pane', '-t', target, '-o', `cat >> "${logPath}"`]);
  if (result.code !== 0) {
    throw new Error(`Failed to setup pipe-pane: ${result.stderr}`);
  }
}

/**
 * Create a new window in a session
 */
export async function createWindow(session: string, path: string, name: string): Promise<void> {
  const result = await execTmux(['new-window', '-t', session, '-c', path, '-n', name]);
  if (result.code !== 0) {
    throw new Error(`Failed to create window: ${result.stderr}`);
  }
}

/**
 * Check if tmux is available
 */
export async function checkTmux(): Promise<boolean> {
  try {
    const result = await execTmux(['-V']);
    return result.code === 0;
  } catch {
    return false;
  }
}

/**
 * Get session info including windows and panes
 */
export async function getSessionInfo(session: string) {
  const windows = await listWindows(session);
  const windowsWithPanes = await Promise.all(
    windows.map(async (win) => {
      const panes = await listPanes(session, win.index);
      return {
        index: win.index,
        name: win.name,
        panes: panes.map((p) => ({
          index: p.index,
          id: p.id,
          active: p.active,
          currentPath: p.currentPath,
        })),
      };
    })
  );
  return windowsWithPanes;
}
