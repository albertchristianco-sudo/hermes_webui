import type { Agent, Conversation, Message, VoiceStatus } from './types';

const PASSWORD_KEY = 'uthers-hand-password';

export function getStoredPassword(): string {
  return localStorage.getItem(PASSWORD_KEY) || '';
}

export function setStoredPassword(value: string) {
  if (value) localStorage.setItem(PASSWORD_KEY, value);
  else localStorage.removeItem(PASSWORD_KEY);
}

function authHeaders(): Record<string, string> {
  const pw = getStoredPassword();
  return pw ? { 'x-uthers-hand-password': pw } : {};
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeaders(),
    ...((init.headers as Record<string, string>) || {}),
  };
  const res = await fetch(path, { ...init, headers });
  if (res.status === 401) throw new Error('unauthorized');
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  authStatus: () => request<{ required: boolean }>('/api/auth/status'),
  health: () => request<{ ok: boolean }>('/api/health'),

  listAgents: () => request<Agent[]>('/api/agents'),
  createAgent: (data: Partial<Agent>) =>
    request<Agent>('/api/agents', { method: 'POST', body: JSON.stringify(data) }),
  updateAgent: (id: number, data: Partial<Agent>) =>
    request<Agent>(`/api/agents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAgent: (id: number) => request<void>(`/api/agents/${id}`, { method: 'DELETE' }),
  uploadPortrait: async (id: number, file: File) => {
    const fd = new FormData();
    fd.append('portrait', file);
    const res = await fetch(`/api/agents/${id}/portrait`, {
      method: 'POST',
      body: fd,
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('upload failed');
    return res.json() as Promise<Agent>;
  },

  listConversations: (agentId: number) =>
    request<Conversation[]>(`/api/conversations/agent/${agentId}`),
  createConversation: (agent_id: number, title?: string) =>
    request<Conversation>('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ agent_id, title }),
    }),
  renameConversation: (id: number, title: string) =>
    request<Conversation>(`/api/conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    }),
  deleteConversation: (id: number) =>
    request<void>(`/api/conversations/${id}`, { method: 'DELETE' }),
  listMessages: (id: number) => request<Message[]>(`/api/conversations/${id}/messages`),

  voiceStatus: () => request<VoiceStatus>('/api/voice'),
};

export type StreamEvent =
  | { type: 'user-message'; message: Message }
  | { type: 'chunk'; delta: string }
  | { type: 'assistant-message'; message: Message }
  | { type: 'error'; message: string }
  | { type: 'done' };

export async function streamChat(
  conversationId: number,
  content: string,
  onEvent: (e: StreamEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(`/api/chat/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ content }),
    signal,
  });
  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `stream failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf('\n\n')) !== -1) {
      const raw = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const lines = raw.split('\n');
      let event = 'message';
      let data = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) event = line.slice(7).trim();
        else if (line.startsWith('data: ')) data += line.slice(6);
      }
      if (!data) continue;
      try {
        const parsed = JSON.parse(data);
        if (event === 'user-message') onEvent({ type: 'user-message', message: parsed });
        else if (event === 'chunk') onEvent({ type: 'chunk', delta: parsed.delta });
        else if (event === 'assistant-message')
          onEvent({ type: 'assistant-message', message: parsed });
        else if (event === 'error')
          onEvent({ type: 'error', message: parsed.message || 'Unknown error' });
        else if (event === 'done') onEvent({ type: 'done' });
      } catch {
        // ignore malformed
      }
    }
  }
}
