#!/usr/bin/env node
// Trinetra Doctor - Diagnostics CLI Command

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as net from 'net';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

// Configuration (same as index.ts)
const HOST = process.env.TRINETRA_HOST || '127.0.0.1';
const SERVER_PORT = parseInt(process.env.TRINETRA_PORT || '3001', 10);
const WEB_PORT = 5173;
const DATA_DIR = path.resolve(REPO_ROOT, process.env.TRINETRA_DATA_DIR || './data');

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

const PASS = `${colors.green}✓${colors.reset}`;
const FAIL = `${colors.red}✗${colors.reset}`;
const WARN = `${colors.yellow}!${colors.reset}`;

interface CheckResult {
  name: string;
  passed: boolean;
  warning?: boolean;
  message: string;
  suggestion?: string;
}

/**
 * Execute a command and return the result
 */
async function execCommand(
  command: string,
  args: string[]
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      resolve({ stdout, stderr, code: code ?? 1 });
    });

    proc.on('error', () => {
      resolve({ stdout: '', stderr: 'Command not found', code: 127 });
    });
  });
}

/**
 * Check if a port is available
 */
async function isPortAvailable(port: number, host: string = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(true);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port, host);
  });
}

/**
 * Check if a directory is writable
 */
async function isWritable(dirPath: string): Promise<boolean> {
  try {
    const testFile = path.join(dirPath, `.trinetra-doctor-test-${Date.now()}`);
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check 1: tmux available on PATH
 */
async function checkTmuxAvailable(): Promise<CheckResult> {
  const result = await execCommand('tmux', ['-V']);

  if (result.code === 0) {
    const version = result.stdout.trim();
    return {
      name: 'tmux available',
      passed: true,
      message: `tmux is installed (${version})`,
    };
  }

  return {
    name: 'tmux available',
    passed: false,
    message: 'tmux is not installed or not in PATH',
    suggestion:
      process.platform === 'darwin'
        ? 'Run: brew install tmux'
        : process.platform === 'linux'
          ? 'Run: sudo apt install tmux (Debian/Ubuntu) or sudo yum install tmux (RHEL/CentOS)'
          : 'Install tmux from https://github.com/tmux/tmux',
  };
}

/**
 * Check 2: Can list tmux sessions
 */
async function checkTmuxListSessions(): Promise<CheckResult> {
  const result = await execCommand('tmux', ['list-sessions']);

  // Success (sessions exist)
  if (result.code === 0) {
    const sessionCount = result.stdout.trim().split('\n').filter(Boolean).length;
    return {
      name: 'tmux list-sessions',
      passed: true,
      message: `tmux server is running (${sessionCount} session${sessionCount !== 1 ? 's' : ''} active)`,
    };
  }

  // No server running or no sessions - this is OK
  const stderr = result.stderr.toLowerCase();
  if (
    stderr.includes('no server running') ||
    stderr.includes('no sessions') ||
    stderr.includes('error connecting') ||
    stderr.includes('no such file or directory')
  ) {
    return {
      name: 'tmux list-sessions',
      passed: true,
      message: 'tmux is available (no active sessions)',
    };
  }

  // Actual error
  return {
    name: 'tmux list-sessions',
    passed: false,
    message: `tmux list-sessions failed: ${result.stderr.trim()}`,
    suggestion: 'Check tmux installation and permissions',
  };
}

/**
 * Check 3: Server port availability
 */
async function checkServerPort(): Promise<CheckResult> {
  const available = await isPortAvailable(SERVER_PORT, HOST);

  if (available) {
    return {
      name: 'Server port',
      passed: true,
      message: `Port ${SERVER_PORT} is available`,
    };
  }

  return {
    name: 'Server port',
    passed: false,
    warning: true,
    message: `Port ${SERVER_PORT} is already in use`,
    suggestion: `Either stop the process using port ${SERVER_PORT}, or set TRINETRA_PORT to a different port`,
  };
}

/**
 * Check 4: Web port availability
 */
async function checkWebPort(): Promise<CheckResult> {
  const available = await isPortAvailable(WEB_PORT, HOST);

  if (available) {
    return {
      name: 'Web port',
      passed: true,
      message: `Port ${WEB_PORT} is available`,
    };
  }

  return {
    name: 'Web port',
    passed: false,
    warning: true,
    message: `Port ${WEB_PORT} is already in use`,
    suggestion: `Either stop the process using port ${WEB_PORT}, or configure Vite to use a different port`,
  };
}

/**
 * Check 5: Data directory exists and is writable
 */
async function checkDataDir(): Promise<CheckResult> {
  const exists = fs.existsSync(DATA_DIR);

  if (!exists) {
    // Try to create it
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      return {
        name: 'Data directory',
        passed: true,
        message: `Data directory created at ${DATA_DIR}`,
      };
    } catch (err) {
      return {
        name: 'Data directory',
        passed: false,
        message: `Cannot create data directory at ${DATA_DIR}`,
        suggestion: `Create the directory manually: mkdir -p "${DATA_DIR}"`,
      };
    }
  }

  const writable = await isWritable(DATA_DIR);
  if (writable) {
    return {
      name: 'Data directory',
      passed: true,
      message: `Data directory exists and is writable (${DATA_DIR})`,
    };
  }

  return {
    name: 'Data directory',
    passed: false,
    message: `Data directory exists but is not writable (${DATA_DIR})`,
    suggestion: `Fix permissions: chmod 755 "${DATA_DIR}"`,
  };
}

/**
 * Check 6: Logs directory exists and is writable
 */
async function checkLogsDir(): Promise<CheckResult> {
  const logsDir = path.join(DATA_DIR, 'logs');
  const exists = fs.existsSync(logsDir);

  if (!exists) {
    // Try to create it
    try {
      fs.mkdirSync(logsDir, { recursive: true });
      return {
        name: 'Logs directory',
        passed: true,
        message: `Logs directory created at ${logsDir}`,
      };
    } catch (err) {
      return {
        name: 'Logs directory',
        passed: false,
        message: `Cannot create logs directory at ${logsDir}`,
        suggestion: `Create the directory manually: mkdir -p "${logsDir}"`,
      };
    }
  }

  const writable = await isWritable(logsDir);
  if (writable) {
    return {
      name: 'Logs directory',
      passed: true,
      message: `Logs directory exists and is writable (${logsDir})`,
    };
  }

  return {
    name: 'Logs directory',
    passed: false,
    message: `Logs directory exists but is not writable (${logsDir})`,
    suggestion: `Fix permissions: chmod 755 "${logsDir}"`,
  };
}

/**
 * Print a check result
 */
function printResult(result: CheckResult): void {
  const icon = result.passed ? PASS : result.warning ? WARN : FAIL;
  console.log(`  ${icon} ${colors.bold}${result.name}${colors.reset}`);
  console.log(`    ${colors.dim}${result.message}${colors.reset}`);

  if (result.suggestion) {
    console.log(`    ${colors.yellow}→ ${result.suggestion}${colors.reset}`);
  }
}

/**
 * Main doctor function
 */
async function main(): Promise<void> {
  console.log();
  console.log(`${colors.cyan}${colors.bold}Trinetra Doctor${colors.reset}`);
  console.log(`${colors.dim}Running diagnostics...${colors.reset}`);
  console.log();

  // Show configuration
  console.log(`${colors.blue}Configuration:${colors.reset}`);
  console.log(`  ${colors.dim}Host:${colors.reset} ${HOST}`);
  console.log(`  ${colors.dim}Server Port:${colors.reset} ${SERVER_PORT}`);
  console.log(`  ${colors.dim}Web Port:${colors.reset} ${WEB_PORT}`);
  console.log(`  ${colors.dim}Data Directory:${colors.reset} ${DATA_DIR}`);
  console.log();

  // Run all checks
  console.log(`${colors.blue}Checks:${colors.reset}`);

  const checks = [
    checkTmuxAvailable,
    checkTmuxListSessions,
    checkServerPort,
    checkWebPort,
    checkDataDir,
    checkLogsDir,
  ];

  const results: CheckResult[] = [];

  for (const check of checks) {
    const result = await check();
    results.push(result);
    printResult(result);
    console.log();
  }

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed && !r.warning).length;
  const warnings = results.filter((r) => !r.passed && r.warning).length;

  console.log(`${colors.blue}Summary:${colors.reset}`);

  if (failed === 0 && warnings === 0) {
    console.log(`  ${colors.green}${colors.bold}All ${passed} checks passed!${colors.reset}`);
    console.log(`  ${colors.dim}Trinetra is ready to run.${colors.reset}`);
  } else if (failed === 0) {
    console.log(
      `  ${colors.green}${passed} passed${colors.reset}, ${colors.yellow}${warnings} warning${warnings !== 1 ? 's' : ''}${colors.reset}`
    );
    console.log(`  ${colors.dim}Trinetra can run, but check the warnings above.${colors.reset}`);
  } else {
    console.log(
      `  ${colors.green}${passed} passed${colors.reset}, ${colors.red}${failed} failed${colors.reset}${warnings > 0 ? `, ${colors.yellow}${warnings} warning${warnings !== 1 ? 's' : ''}${colors.reset}` : ''}`
    );
    console.log(`  ${colors.dim}Please fix the issues above before running Trinetra.${colors.reset}`);
  }

  console.log();

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`${FAIL} Doctor failed with an unexpected error:`, err);
  process.exit(1);
});
