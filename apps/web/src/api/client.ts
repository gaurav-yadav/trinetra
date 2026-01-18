import type {
  ApiResponse,
  Workspace,
  CreateWorkspacePayload,
  UpdateWorkspacePayload,
  Template,
  CreateTemplatePayload,
  UpdateTemplatePayload,
  Session,
  SessionWithDetails,
  CreateSessionPayload,
  RenameSessionPayload,
} from '@trinetra/shared';

const getBaseUrl = () => {
  const stored = localStorage.getItem('trinetra-server-url');
  return stored || '';
};

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data: ApiResponse<T> = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Request failed');
  }

  return data.data as T;
}

// Workspace API
export const workspaceApi = {
  list: () => request<Workspace[]>('/api/workspaces'),
  get: (id: string) => request<Workspace>(`/api/workspaces/${id}`),
  create: (payload: CreateWorkspacePayload) =>
    request<Workspace>('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: UpdateWorkspacePayload) =>
    request<Workspace>(`/api/workspaces/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  delete: (id: string) =>
    request<void>(`/api/workspaces/${id}`, {
      method: 'DELETE',
    }),
};

// Template API
export const templateApi = {
  list: () => request<Template[]>('/api/templates'),
  get: (id: string) => request<Template>(`/api/templates/${id}`),
  create: (payload: CreateTemplatePayload) =>
    request<Template>('/api/templates', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: UpdateTemplatePayload) =>
    request<Template>(`/api/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  delete: (id: string) =>
    request<void>(`/api/templates/${id}`, {
      method: 'DELETE',
    }),
};

// Session API
export const sessionApi = {
  list: () => request<Session[]>('/api/sessions'),
  get: (id: string) => request<SessionWithDetails>(`/api/sessions/${id}`),
  create: (payload: CreateSessionPayload) =>
    request<Session>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  rename: (id: string, payload: RenameSessionPayload) =>
    request<Session>(`/api/sessions/${id}/rename`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  kill: (id: string) =>
    request<void>(`/api/sessions/${id}/kill`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  // NOTE: interrupt endpoint not implemented in backend - would need POST /api/sessions/:id/interrupt
  // interrupt: (id: string) =>
  //   request<void>(`/api/sessions/${id}/interrupt`, {
  //     method: 'POST',
  //   }),

  // NOTE: sync endpoint not implemented in backend. Session discovery is handled automatically
  // by GET /api/sessions which merges DB sessions with discovered tmux sessions.
  // sync: () => request<{ discovered: number }>('/api/sessions/sync', { method: 'POST' }),
};
