// Trinetra Shared Types

// ============ Enums ============

export enum SessionStatus {
  RUNNING = 'RUNNING',
  IDLE = 'IDLE',
  EXITED = 'EXITED',
  ERROR = 'ERROR',
}

export enum SessionPhase {
  BUILDING = 'BUILDING',
  TESTING = 'TESTING',
  CODING = 'CODING',
  IDLE = 'IDLE',
  WAITING = 'WAITING',
  ERROR = 'ERROR',
}

export enum InputMode {
  RAW = 'raw',
  COMMAND = 'command',
}

// ============ Workspace Types ============

export interface Workspace {
  id: string;
  name: string;
  path: string;
  defaultTemplateId?: string;
  envHint?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspacePayload {
  name: string;
  path: string;
  defaultTemplateId?: string;
  envHint?: string;
}

export interface UpdateWorkspacePayload {
  name?: string;
  path?: string;
  defaultTemplateId?: string;
  envHint?: string;
}

// ============ Template Types ============

export interface Template {
  id: string;
  name: string;
  command: string;
  autoRun: boolean;
  shell?: string;
  preCommands: string[];
  postCommands: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplatePayload {
  name: string;
  command: string;
  autoRun?: boolean;
  shell?: string;
  preCommands?: string[];
  postCommands?: string[];
}

export interface UpdateTemplatePayload {
  name?: string;
  command?: string;
  autoRun?: boolean;
  shell?: string;
  preCommands?: string[];
  postCommands?: string[];
}

// ============ Session Types ============

export interface Session {
  id: string;
  tmuxSession: string;
  workspaceId?: string;
  title: string;
  status: SessionStatus;
  phase?: SessionPhase;
  activePane: string;
  createdAt: string;
  lastActivityAt: string;
  discovered?: boolean;
}

export interface SessionWithDetails extends Session {
  workspace?: Workspace;
  windows: TmuxWindow[];
}

export interface TmuxWindow {
  index: number;
  name: string;
  panes: TmuxPane[];
}

export interface TmuxPane {
  index: number;
  id: string;
  active: boolean;
  currentPath: string;
}

export interface CreateSessionPayload {
  workspaceId?: string;
  templateId?: string;
  title?: string;
  pathOverride?: string;
}

export interface RenameSessionPayload {
  title: string;
}

// ============ WebSocket Message Types ============

// Client -> Server
export type ClientMessage =
  | SubscribeMessage
  | UnsubscribeMessage
  | InputMessage
  | KeyMessage
  | ResizeMessage;

export interface SubscribeMessage {
  type: 'subscribe';
  sessionId: string;
  paneKey: string;
}

export interface UnsubscribeMessage {
  type: 'unsubscribe';
  sessionId: string;
  paneKey: string;
}

export interface InputMessage {
  type: 'input';
  sessionId: string;
  paneKey: string;
  data: string;
  mode: InputMode;
}

export interface KeyMessage {
  type: 'key';
  sessionId: string;
  paneKey: string;
  key: 'C-c' | 'C-z' | 'Enter' | 'Escape' | 'Up' | 'Down' | 'Left' | 'Right' | 'Tab' | 'Space' | '1' | '2' | '3' | '4' | '5' | 'y' | 'n';
}

export interface ResizeMessage {
  type: 'resize';
  sessionId: string;
  paneKey: string;
  cols: number;
  rows: number;
}

// Server -> Client
export type ServerMessage =
  | SnapshotMessage
  | OutputMessage
  | StatusMessage
  | ErrorMessage;

export interface SnapshotMessage {
  type: 'snapshot';
  sessionId: string;
  paneKey: string;
  text: string;
}

export interface OutputMessage {
  type: 'output';
  sessionId: string;
  paneKey: string;
  chunk: string;
}

export interface StatusMessage {
  type: 'status';
  sessionId: string;
  status: SessionStatus;
  phase?: SessionPhase;
  lastActivityAt: string;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
  details?: string;
}

// ============ API Response Types ============

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
