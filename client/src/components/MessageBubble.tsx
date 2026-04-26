import type { Agent, Message } from '../types';
import { AgentPortrait } from './AgentPortrait';
import { Markdown } from './Markdown';

interface Props {
  message: Pick<Message, 'role' | 'content'> & { id?: number };
  agent: Agent | null;
  streaming?: boolean;
  error?: boolean;
}

export function MessageBubble({ message, agent, streaming, error }: Props) {
  const isUser = message.role === 'user';
  return (
    <div className={`message ${isUser ? 'user' : 'assistant'}`}>
      <div className="message-portrait">
        {isUser ? <span>You</span> : <AgentPortrait agent={agent} size="sm" />}
      </div>
      <div className={`bubble ${streaming ? 'streaming' : ''} ${error ? 'error' : ''}`}>
        {isUser ? (
          <p style={{ whiteSpace: 'pre-wrap' }}>{message.content}</p>
        ) : (
          <Markdown>{message.content || (streaming ? '...' : '')}</Markdown>
        )}
      </div>
    </div>
  );
}
