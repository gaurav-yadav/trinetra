// Database Module - SQLite with sql.js (pure JS, no native compilation)

import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import * as path from 'path';
import * as fs from 'fs';
import type {
  Workspace,
  Template,
  Session,
  CreateWorkspacePayload,
  UpdateWorkspacePayload,
  CreateTemplatePayload,
  UpdateTemplatePayload,
  SessionStatus,
  SessionPhase,
} from '@trinetra/shared';

let db: SqlJsDatabase | null = null;
let dbPath: string | null = null;

export function getDb(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

function saveDb(): void {
  if (db && dbPath) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

export async function initDb(dataDir: string): Promise<SqlJsDatabase> {
  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  dbPath = path.join(dataDir, 'ccp.sqlite');

  const SQL = await initSqlJs();

  // Load existing database or create new one
  const database = fs.existsSync(dbPath)
    ? new SQL.Database(fs.readFileSync(dbPath))
    : new SQL.Database();
  db = database;

  // Create tables
  database.run(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      defaultTemplateId TEXT,
      envHint TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      command TEXT NOT NULL,
      autoRun INTEGER NOT NULL DEFAULT 0,
      shell TEXT,
      preCommands TEXT NOT NULL DEFAULT '[]',
      postCommands TEXT NOT NULL DEFAULT '[]',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      tmuxSession TEXT NOT NULL UNIQUE,
      workspaceId TEXT,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      phase TEXT,
      activePane TEXT NOT NULL DEFAULT '0.0',
      createdAt TEXT NOT NULL,
      lastActivityAt TEXT NOT NULL,
      FOREIGN KEY (workspaceId) REFERENCES workspaces(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
    CREATE INDEX IF NOT EXISTS idx_sessions_tmuxSession ON sessions(tmuxSession);
  `);

  saveDb();
  return database;
}

export function closeDb(): void {
  if (db) {
    saveDb();
    db.close();
    db = null;
    dbPath = null;
  }
}

// Helper to run queries and get results
function queryAll<T>(sql: string, params: unknown[] = []): T[] {
  const stmt = getDb().prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

function queryOne<T>(sql: string, params: unknown[] = []): T | null {
  const results = queryAll<T>(sql, params);
  return results.length > 0 ? results[0] : null;
}

function run(sql: string, params: unknown[] = []): void {
  getDb().run(sql, params);
  saveDb();
}

// ============ Workspace Operations ============

export function getAllWorkspaces(): Workspace[] {
  return queryAll<Workspace>('SELECT * FROM workspaces ORDER BY name ASC');
}

export function getWorkspaceById(id: string): Workspace | null {
  return queryOne<Workspace>('SELECT * FROM workspaces WHERE id = ?', [id]);
}

export function createWorkspace(id: string, data: CreateWorkspacePayload): Workspace {
  const now = new Date().toISOString();
  run(
    `INSERT INTO workspaces (id, name, path, defaultTemplateId, envHint, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, data.name, data.path, data.defaultTemplateId || null, data.envHint || null, now, now]
  );
  return getWorkspaceById(id)!;
}

export function updateWorkspace(id: string, data: UpdateWorkspacePayload): Workspace | null {
  const existing = getWorkspaceById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  run(
    `UPDATE workspaces
     SET name = ?, path = ?, defaultTemplateId = ?, envHint = ?, updatedAt = ?
     WHERE id = ?`,
    [
      data.name ?? existing.name,
      data.path ?? existing.path,
      data.defaultTemplateId !== undefined ? data.defaultTemplateId : existing.defaultTemplateId,
      data.envHint !== undefined ? data.envHint : existing.envHint,
      now,
      id,
    ]
  );
  return getWorkspaceById(id);
}

export function deleteWorkspace(id: string): boolean {
  const existing = getWorkspaceById(id);
  if (!existing) return false;
  run('DELETE FROM workspaces WHERE id = ?', [id]);
  return true;
}

// ============ Template Operations ============

interface TemplateRow {
  id: string;
  name: string;
  command: string;
  autoRun: number;
  shell: string | null;
  preCommands: string;
  postCommands: string;
  createdAt: string;
  updatedAt: string;
}

function rowToTemplate(row: TemplateRow): Template {
  return {
    id: row.id,
    name: row.name,
    command: row.command,
    autoRun: row.autoRun === 1,
    shell: row.shell ?? undefined,
    preCommands: JSON.parse(row.preCommands),
    postCommands: JSON.parse(row.postCommands),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function getAllTemplates(): Template[] {
  const rows = queryAll<TemplateRow>('SELECT * FROM templates ORDER BY name ASC');
  return rows.map(rowToTemplate);
}

export function getTemplateById(id: string): Template | null {
  const row = queryOne<TemplateRow>('SELECT * FROM templates WHERE id = ?', [id]);
  return row ? rowToTemplate(row) : null;
}

export function createTemplate(id: string, data: CreateTemplatePayload): Template {
  const now = new Date().toISOString();
  run(
    `INSERT INTO templates (id, name, command, autoRun, shell, preCommands, postCommands, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.name,
      data.command,
      data.autoRun ? 1 : 0,
      data.shell || null,
      JSON.stringify(data.preCommands || []),
      JSON.stringify(data.postCommands || []),
      now,
      now,
    ]
  );
  return getTemplateById(id)!;
}

export function updateTemplate(id: string, data: UpdateTemplatePayload): Template | null {
  const existing = getTemplateById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  run(
    `UPDATE templates
     SET name = ?, command = ?, autoRun = ?, shell = ?, preCommands = ?, postCommands = ?, updatedAt = ?
     WHERE id = ?`,
    [
      data.name ?? existing.name,
      data.command ?? existing.command,
      data.autoRun !== undefined ? (data.autoRun ? 1 : 0) : existing.autoRun ? 1 : 0,
      data.shell !== undefined ? data.shell : existing.shell || null,
      data.preCommands !== undefined ? JSON.stringify(data.preCommands) : JSON.stringify(existing.preCommands),
      data.postCommands !== undefined ? JSON.stringify(data.postCommands) : JSON.stringify(existing.postCommands),
      now,
      id,
    ]
  );
  return getTemplateById(id);
}

export function deleteTemplate(id: string): boolean {
  const existing = getTemplateById(id);
  if (!existing) return false;
  run('DELETE FROM templates WHERE id = ?', [id]);
  return true;
}

// ============ Session Operations ============

interface SessionRow {
  id: string;
  tmuxSession: string;
  workspaceId: string | null;
  title: string;
  status: string;
  phase: string | null;
  activePane: string;
  createdAt: string;
  lastActivityAt: string;
}

function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    tmuxSession: row.tmuxSession,
    workspaceId: row.workspaceId ?? undefined,
    title: row.title,
    status: row.status as SessionStatus,
    phase: row.phase as SessionPhase | undefined,
    activePane: row.activePane,
    createdAt: row.createdAt,
    lastActivityAt: row.lastActivityAt,
  };
}

export function getAllSessions(): Session[] {
  const rows = queryAll<SessionRow>('SELECT * FROM sessions ORDER BY lastActivityAt DESC');
  return rows.map(rowToSession);
}

export function getSessionById(id: string): Session | null {
  const row = queryOne<SessionRow>('SELECT * FROM sessions WHERE id = ?', [id]);
  return row ? rowToSession(row) : null;
}

export function getSessionByTmuxSession(tmuxSession: string): Session | null {
  const row = queryOne<SessionRow>('SELECT * FROM sessions WHERE tmuxSession = ?', [tmuxSession]);
  return row ? rowToSession(row) : null;
}

export function createSession(
  id: string,
  tmuxSession: string,
  title: string,
  status: SessionStatus,
  workspaceId?: string,
  phase?: SessionPhase
): Session {
  const now = new Date().toISOString();
  run(
    `INSERT INTO sessions (id, tmuxSession, workspaceId, title, status, phase, activePane, createdAt, lastActivityAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, tmuxSession, workspaceId || null, title, status, phase || null, '0.0', now, now]
  );
  return getSessionById(id)!;
}

export function updateSessionStatus(id: string, status: SessionStatus, phase?: SessionPhase): void {
  const now = new Date().toISOString();
  run(
    `UPDATE sessions SET status = ?, phase = ?, lastActivityAt = ? WHERE id = ?`,
    [status, phase || null, now, id]
  );
}

export function updateSessionTitle(id: string, title: string): void {
  const now = new Date().toISOString();
  run(`UPDATE sessions SET title = ?, lastActivityAt = ? WHERE id = ?`, [title, now, id]);
}

export function updateSessionActivity(id: string): void {
  const now = new Date().toISOString();
  run(`UPDATE sessions SET lastActivityAt = ? WHERE id = ?`, [now, id]);
}

export function updateSessionActivePane(id: string, activePane: string): void {
  run(`UPDATE sessions SET activePane = ? WHERE id = ?`, [activePane, id]);
}

export function deleteSession(id: string): boolean {
  const existing = getSessionById(id);
  if (!existing) return false;
  run('DELETE FROM sessions WHERE id = ?', [id]);
  return true;
}

export function deleteSessionByTmuxSession(tmuxSession: string): boolean {
  const existing = getSessionByTmuxSession(tmuxSession);
  if (!existing) return false;
  run('DELETE FROM sessions WHERE tmuxSession = ?', [tmuxSession]);
  return true;
}
