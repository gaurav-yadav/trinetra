#!/usr/bin/env node
// Trinetra CLI - Service management commands

import { spawn, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as net from 'net';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const TRINETRA_HOME = path.join(os.homedir(), '.trinetra');
const PID_FILE = path.join(TRINETRA_HOME, 'trinetra.pid');
const LOG_FILE = path.join(TRINETRA_HOME, 'trinetra.log');
const SERVER_ENTRY = path.resolve(__dirname, 'index.ts');
const DIST_ENTRY = path.resolve(__dirname, 'index.js');

// Configuration
const HOST = process.env.TRINETRA_HOST || '127.0.0.1';
const PORT = parseInt(process.env.TRINETRA_PORT || '3001', 10);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Ensure the trinetra home directory exists
 */
function ensureTrinetraHome(): void {
  if (!fs.existsSync(TRINETRA_HOME)) {
    fs.mkdirSync(TRINETRA_HOME, { recursive: true });
  }
}

/**
 * Get the PID from the PID file, or null if not running
 */
function getPid(): number | null {
  try {
    if (fs.existsSync(PID_FILE)) {
      const pidStr = fs.readFileSync(PID_FILE, 'utf-8').trim();
      const pid = parseInt(pidStr, 10);
      if (!isNaN(pid) && pid > 0) {
        return pid;
      }
    }
  } catch {
    // Ignore errors
  }
  return null;
}

/**
 * Check if a process with the given PID is running
 */
function isProcessRunning(pid: number): boolean {
  try {
    // Sending signal 0 checks if process exists without killing it
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if the server is responding on its port
 */
async function isServerResponding(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 2000);

    socket.on('connect', () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve(true);
    });

    socket.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });

    socket.connect(PORT, HOST);
  });
}

/**
 * Find the tsx binary
 */
function findTsx(): string | null {
  // Check node_modules/.bin in server directory
  const localTsx = path.resolve(__dirname, '..', 'node_modules', '.bin', 'tsx');
  if (fs.existsSync(localTsx)) {
    return localTsx;
  }

  // Check node_modules/.bin in repo root
  const repoTsx = path.resolve(__dirname, '..', '..', '..', 'node_modules', '.bin', 'tsx');
  if (fs.existsSync(repoTsx)) {
    return repoTsx;
  }

  // Try to find it via which
  try {
    const globalTsx = execSync('which tsx', { encoding: 'utf-8' }).trim();
    if (globalTsx && fs.existsSync(globalTsx)) {
      return globalTsx;
    }
  } catch {
    // Ignore
  }

  return null;
}

/**
 * Get the appropriate command to run the server
 */
function getServerCommand(): { cmd: string; args: string[] } | null {
  // Prefer compiled JS if it exists
  if (fs.existsSync(DIST_ENTRY)) {
    return { cmd: 'node', args: [DIST_ENTRY] };
  }

  // Fall back to tsx for TypeScript
  if (fs.existsSync(SERVER_ENTRY)) {
    const tsx = findTsx();
    if (tsx) {
      return { cmd: tsx, args: [SERVER_ENTRY] };
    }
    console.error(`${colors.red}Error: tsx not found. Install it or build the server first.${colors.reset}`);
    console.error(`  Run: pnpm install`);
    console.error(`  Or:  pnpm --filter @trinetra/server build`);
    return null;
  }

  console.error(`${colors.red}Error: Server entry point not found.${colors.reset}`);
  console.error(`  Expected: ${SERVER_ENTRY} or ${DIST_ENTRY}`);
  return null;
}

/**
 * Start the server as a daemon
 */
async function startDaemon(): Promise<void> {
  console.log(`${colors.cyan}${colors.bold}Trinetra${colors.reset}`);

  // Check if already running
  const pid = getPid();
  if (pid && isProcessRunning(pid)) {
    console.log(`${colors.yellow}Server is already running (PID: ${pid})${colors.reset}`);
    return;
  }

  // Clean up stale PID file
  if (pid) {
    fs.unlinkSync(PID_FILE);
  }

  ensureTrinetraHome();

  const serverCmd = getServerCommand();
  if (!serverCmd) {
    process.exit(1);
  }

  console.log(`${colors.dim}Starting server...${colors.reset}`);

  // Open log file for writing
  const logFd = fs.openSync(LOG_FILE, 'a');

  // Spawn the server process detached
  const child = spawn(serverCmd.cmd, serverCmd.args, {
    detached: true,
    stdio: ['ignore', logFd, logFd],
    env: {
      ...process.env,
      TRINETRA_HOST: HOST,
      TRINETRA_PORT: String(PORT),
    },
    cwd: path.resolve(__dirname, '..'),
  });

  // Write PID file
  fs.writeFileSync(PID_FILE, String(child.pid));

  // Unref so parent can exit
  child.unref();
  fs.closeSync(logFd);

  // Wait a moment for the server to start
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Check if server started successfully
  const responding = await isServerResponding();
  if (responding) {
    console.log(`${colors.green}Server started successfully${colors.reset}`);
    console.log(`  ${colors.dim}PID:${colors.reset}  ${child.pid}`);
    console.log(`  ${colors.dim}URL:${colors.reset}  http://${HOST}:${PORT}`);
    console.log(`  ${colors.dim}Logs:${colors.reset} ${LOG_FILE}`);
    console.log();
    console.log(`${colors.dim}Stop with: trinetra down${colors.reset}`);
  } else {
    // Check if process is still running
    if (child.pid && isProcessRunning(child.pid)) {
      console.log(`${colors.yellow}Server started but not responding yet (PID: ${child.pid})${colors.reset}`);
      console.log(`${colors.dim}Check logs: trinetra logs${colors.reset}`);
    } else {
      console.error(`${colors.red}Server failed to start${colors.reset}`);
      console.error(`${colors.dim}Check logs: trinetra logs${colors.reset}`);
      // Clean up PID file
      if (fs.existsSync(PID_FILE)) {
        fs.unlinkSync(PID_FILE);
      }
      process.exit(1);
    }
  }
}

/**
 * Stop the daemon
 */
function stopDaemon(): void {
  console.log(`${colors.cyan}${colors.bold}Trinetra${colors.reset}`);

  const pid = getPid();

  if (!pid) {
    console.log(`${colors.yellow}Server is not running (no PID file)${colors.reset}`);
    return;
  }

  if (!isProcessRunning(pid)) {
    console.log(`${colors.yellow}Server is not running (stale PID file)${colors.reset}`);
    fs.unlinkSync(PID_FILE);
    return;
  }

  console.log(`${colors.dim}Stopping server (PID: ${pid})...${colors.reset}`);

  try {
    // Send SIGTERM for graceful shutdown
    process.kill(pid, 'SIGTERM');

    // Wait for process to exit
    let attempts = 0;
    const maxAttempts = 30; // 3 seconds

    const checkInterval = setInterval(() => {
      attempts++;
      if (!isProcessRunning(pid)) {
        clearInterval(checkInterval);
        console.log(`${colors.green}Server stopped${colors.reset}`);
        if (fs.existsSync(PID_FILE)) {
          fs.unlinkSync(PID_FILE);
        }
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.log(`${colors.yellow}Server did not stop gracefully, sending SIGKILL...${colors.reset}`);
        try {
          process.kill(pid, 'SIGKILL');
          console.log(`${colors.green}Server killed${colors.reset}`);
        } catch {
          console.error(`${colors.red}Failed to kill server${colors.reset}`);
        }
        if (fs.existsSync(PID_FILE)) {
          fs.unlinkSync(PID_FILE);
        }
      }
    }, 100);
  } catch (err) {
    console.error(`${colors.red}Failed to stop server: ${err}${colors.reset}`);
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
    process.exit(1);
  }
}

/**
 * Show server status
 */
async function showStatus(): Promise<void> {
  console.log(`${colors.cyan}${colors.bold}Trinetra Status${colors.reset}`);
  console.log();

  const pid = getPid();
  const processRunning = pid ? isProcessRunning(pid) : false;
  const serverResponding = await isServerResponding();

  // PID status
  if (pid && processRunning) {
    console.log(`  ${colors.green}PID:${colors.reset}      ${pid} (running)`);
  } else if (pid) {
    console.log(`  ${colors.yellow}PID:${colors.reset}      ${pid} (stale)`);
  } else {
    console.log(`  ${colors.dim}PID:${colors.reset}      not found`);
  }

  // Server status
  if (serverResponding) {
    console.log(`  ${colors.green}Server:${colors.reset}   running at http://${HOST}:${PORT}`);
  } else {
    console.log(`  ${colors.dim}Server:${colors.reset}   not responding`);
  }

  // Paths
  console.log();
  console.log(`  ${colors.dim}PID file:${colors.reset} ${PID_FILE}`);
  console.log(`  ${colors.dim}Log file:${colors.reset} ${LOG_FILE}`);
  console.log();

  // Summary
  if (processRunning && serverResponding) {
    console.log(`${colors.green}${colors.bold}Status: Running${colors.reset}`);
  } else if (processRunning) {
    console.log(`${colors.yellow}${colors.bold}Status: Starting or unhealthy${colors.reset}`);
  } else {
    console.log(`${colors.dim}${colors.bold}Status: Stopped${colors.reset}`);
  }
}

/**
 * Tail the log file
 */
function tailLogs(follow: boolean = true, lines: number = 50): void {
  if (!fs.existsSync(LOG_FILE)) {
    console.log(`${colors.yellow}No log file found at ${LOG_FILE}${colors.reset}`);
    console.log(`${colors.dim}Start the server first: trinetra up${colors.reset}`);
    return;
  }

  console.log(`${colors.cyan}${colors.bold}Trinetra Logs${colors.reset}`);
  console.log(`${colors.dim}${LOG_FILE}${colors.reset}`);
  console.log();

  if (follow) {
    // Use tail -f for following logs
    const tailProc = spawn('tail', ['-f', '-n', String(lines), LOG_FILE], {
      stdio: 'inherit',
    });

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      tailProc.kill();
      process.exit(0);
    });
  } else {
    // Just print last N lines
    try {
      const content = fs.readFileSync(LOG_FILE, 'utf-8');
      const allLines = content.split('\n');
      const lastLines = allLines.slice(-lines).join('\n');
      console.log(lastLines);
    } catch (err) {
      console.error(`${colors.red}Error reading log file: ${err}${colors.reset}`);
      process.exit(1);
    }
  }
}

/**
 * Print usage information
 */
function printUsage(): void {
  console.log(`${colors.cyan}${colors.bold}Trinetra CLI${colors.reset}`);
  console.log();
  console.log(`${colors.bold}Usage:${colors.reset}`);
  console.log(`  trinetra <command> [options]`);
  console.log();
  console.log(`${colors.bold}Commands:${colors.reset}`);
  console.log(`  ${colors.green}up${colors.reset}         Start the Trinetra server in the background`);
  console.log(`  ${colors.green}down${colors.reset}       Stop the Trinetra server`);
  console.log(`  ${colors.green}stop${colors.reset}       Stop the Trinetra server (alias for down)`);
  console.log(`  ${colors.green}status${colors.reset}     Check if the server is running`);
  console.log(`  ${colors.green}logs${colors.reset}       Tail the server log file`);
  console.log(`  ${colors.green}doctor${colors.reset}     Run diagnostics`);
  console.log(`  ${colors.green}help${colors.reset}       Show this help message`);
  console.log();
  console.log(`${colors.bold}Options:${colors.reset}`);
  console.log(`  ${colors.dim}logs${colors.reset} --no-follow, -n   Print logs without following`);
  console.log(`  ${colors.dim}logs${colors.reset} --lines <n>, -l   Number of lines to show (default: 50)`);
  console.log();
  console.log(`${colors.bold}Environment Variables:${colors.reset}`);
  console.log(`  TRINETRA_HOST      Server bind address (default: 127.0.0.1)`);
  console.log(`  TRINETRA_PORT      Server port (default: 3001)`);
  console.log(`  TRINETRA_DATA_DIR  Data directory (default: ./data)`);
  console.log();
  console.log(`${colors.bold}Files:${colors.reset}`);
  console.log(`  ${colors.dim}PID file:${colors.reset} ${PID_FILE}`);
  console.log(`  ${colors.dim}Log file:${colors.reset} ${LOG_FILE}`);
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'up':
    case 'start':
      await startDaemon();
      break;

    case 'down':
    case 'stop':
      stopDaemon();
      break;

    case 'status':
      await showStatus();
      break;

    case 'logs':
    case 'log': {
      let follow = true;
      let lines = 50;

      for (let i = 1; i < args.length; i++) {
        if (args[i] === '--no-follow' || args[i] === '-n') {
          follow = false;
        } else if (args[i] === '--lines' || args[i] === '-l') {
          const nextArg = args[i + 1];
          if (nextArg) {
            const parsed = parseInt(nextArg, 10);
            if (!isNaN(parsed) && parsed > 0) {
              lines = parsed;
              i++;
            }
          }
        }
      }

      tailLogs(follow, lines);
      break;
    }

    case 'doctor': {
      // Run the doctor command
      const doctorEntry = path.resolve(__dirname, 'doctor.ts');
      const doctorDist = path.resolve(__dirname, 'doctor.js');

      if (fs.existsSync(doctorDist)) {
        const child = spawn('node', [doctorDist], { stdio: 'inherit' });
        child.on('exit', (code) => process.exit(code ?? 0));
      } else if (fs.existsSync(doctorEntry)) {
        const tsx = findTsx();
        if (tsx) {
          const child = spawn(tsx, [doctorEntry], { stdio: 'inherit' });
          child.on('exit', (code) => process.exit(code ?? 0));
        } else {
          console.error(`${colors.red}Error: tsx not found${colors.reset}`);
          process.exit(1);
        }
      } else {
        console.error(`${colors.red}Error: doctor script not found${colors.reset}`);
        process.exit(1);
      }
      break;
    }

    case 'help':
    case '--help':
    case '-h':
    case undefined:
      printUsage();
      break;

    default:
      console.error(`${colors.red}Unknown command: ${command}${colors.reset}`);
      console.log();
      printUsage();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(`${colors.red}Error: ${err.message}${colors.reset}`);
  process.exit(1);
});
