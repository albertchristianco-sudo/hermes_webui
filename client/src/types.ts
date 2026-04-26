export interface Agent {
  id: number;
  name: string;
  profile: string;
  command_template: string;
  portrait_path: string | null;
  accent: string;
  tagline: string | null;
  created_at: number;
}

export interface Conversation {
  id: number;
  agent_id: number;
  title: string;
  created_at: number;
  updated_at: number;
}

export interface Message {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: number;
}

export interface VoiceStatus {
  dir: string;
  clips: Record<'ready' | 'send' | 'receive' | 'error', string | null>;
}
