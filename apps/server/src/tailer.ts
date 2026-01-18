// File Tailer - Watch log files and emit new chunks

import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

export interface TailerEvents {
  chunk: (paneKey: string, data: string) => void;
  error: (paneKey: string, error: Error) => void;
}

interface FileState {
  path: string;
  offset: number;
  watcher: fs.FSWatcher | null;
  fd: number | null;
  subscribers: Set<string>; // Connection IDs
}

export class FileTailer extends EventEmitter {
  private files: Map<string, FileState> = new Map();

  constructor() {
    super();
  }

  /**
   * Get the log file path for a pane
   */
  static getLogPath(dataDir: string, sessionId: string, paneKey: string): string {
    return path.join(dataDir, 'logs', sessionId, `${paneKey}.log`);
  }

  /**
   * Subscribe to a log file for a pane
   */
  subscribe(paneKey: string, logPath: string, connectionId: string): void {
    let state = this.files.get(paneKey);

    if (state) {
      // Already watching this file, just add subscriber
      state.subscribers.add(connectionId);
      return;
    }

    // Create new state
    state = {
      path: logPath,
      offset: 0,
      watcher: null,
      fd: null,
      subscribers: new Set([connectionId]),
    };
    this.files.set(paneKey, state);

    // Ensure directory exists
    const dir = path.dirname(logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Ensure file exists
    if (!fs.existsSync(logPath)) {
      fs.writeFileSync(logPath, '');
    }

    // Get initial file size
    try {
      const stats = fs.statSync(logPath);
      state.offset = stats.size;
    } catch {
      state.offset = 0;
    }

    // Start watching
    this.startWatching(paneKey, state);
  }

  /**
   * Unsubscribe from a log file
   */
  unsubscribe(paneKey: string, connectionId: string): void {
    const state = this.files.get(paneKey);
    if (!state) return;

    state.subscribers.delete(connectionId);

    // If no more subscribers, stop watching
    if (state.subscribers.size === 0) {
      this.stopWatching(paneKey, state);
      this.files.delete(paneKey);
    }
  }

  /**
   * Unsubscribe a connection from all files
   */
  unsubscribeAll(connectionId: string): void {
    for (const [paneKey] of this.files) {
      this.unsubscribe(paneKey, connectionId);
    }
  }

  /**
   * Read existing content from a log file (for snapshot)
   */
  readSnapshot(logPath: string): string {
    try {
      if (!fs.existsSync(logPath)) {
        return '';
      }
      return fs.readFileSync(logPath, 'utf-8');
    } catch {
      return '';
    }
  }

  /**
   * Start watching a file for changes
   */
  private startWatching(paneKey: string, state: FileState): void {
    try {
      state.watcher = fs.watch(state.path, (eventType) => {
        if (eventType === 'change') {
          this.readNewContent(paneKey, state);
        }
      });

      state.watcher.on('error', (err) => {
        this.emit('error', paneKey, err);
      });
    } catch (err) {
      this.emit('error', paneKey, err as Error);
    }
  }

  /**
   * Stop watching a file
   */
  private stopWatching(paneKey: string, state: FileState): void {
    if (state.watcher) {
      state.watcher.close();
      state.watcher = null;
    }
    if (state.fd !== null) {
      try {
        fs.closeSync(state.fd);
      } catch {
        // Ignore close errors
      }
      state.fd = null;
    }
  }

  /**
   * Read new content from a file
   */
  private readNewContent(paneKey: string, state: FileState): void {
    try {
      const stats = fs.statSync(state.path);
      const newSize = stats.size;

      if (newSize <= state.offset) {
        // File was truncated or no new content
        if (newSize < state.offset) {
          state.offset = 0;
        }
        return;
      }

      const bytesToRead = newSize - state.offset;
      const buffer = Buffer.alloc(bytesToRead);
      const fd = fs.openSync(state.path, 'r');

      try {
        fs.readSync(fd, buffer, 0, bytesToRead, state.offset);
        const chunk = buffer.toString('utf-8');
        state.offset = newSize;

        if (chunk.length > 0) {
          this.emit('chunk', paneKey, chunk);
        }
      } finally {
        fs.closeSync(fd);
      }
    } catch (err) {
      this.emit('error', paneKey, err as Error);
    }
  }

  /**
   * Close all watchers
   */
  close(): void {
    for (const [paneKey, state] of this.files) {
      this.stopWatching(paneKey, state);
    }
    this.files.clear();
  }
}

// Singleton instance
let tailerInstance: FileTailer | null = null;

export function getTailer(): FileTailer {
  if (!tailerInstance) {
    tailerInstance = new FileTailer();
  }
  return tailerInstance;
}
