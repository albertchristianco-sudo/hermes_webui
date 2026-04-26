import type { Agent, Conversation } from '../types';
import { AgentPortrait } from './AgentPortrait';

interface Props {
  agents: Agent[];
  activeAgent: Agent | null;
  onSelectAgent: (a: Agent) => void;
  onAddAgent: () => void;
  onEditAgent: (a: Agent) => void;

  conversations: Conversation[];
  activeConversation: Conversation | null;
  onSelectConversation: (c: Conversation) => void;
  onNewConversation: () => void;
  onDeleteConversation: (c: Conversation) => void;
  onRenameConversation: (c: Conversation) => void;

  onOpenSettings: () => void;
}

export function Sidebar(props: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand">
          <img src="/sigil.svg" className="brand-mark" alt="" />
          <div>
            <span className="brand-name">Uther's Hand</span>
            <span className="brand-sub">Hermes — Light's Chosen</span>
          </div>
        </div>
      </div>

      <div className="sidebar-section">
        <span>Champions</span>
        <button onClick={props.onAddAgent} title="Summon another champion">+</button>
      </div>
      <div className="sidebar-list">
        {props.agents.map((a) => (
          <button
            key={a.id}
            className={`agent-item ${props.activeAgent?.id === a.id ? 'active' : ''}`}
            onClick={() => props.onSelectAgent(a)}
            onDoubleClick={() => props.onEditAgent(a)}
            title="Double-click to edit"
          >
            <AgentPortrait agent={a} size="sm" />
            <div className="agent-meta">
              <span className="agent-name-sm">{a.name}</span>
              <span className="agent-profile-sm">profile: {a.profile}</span>
            </div>
          </button>
        ))}
        {props.agents.length === 0 && (
          <div style={{ padding: '8px 10px', fontSize: 12, color: 'var(--parchment-dark)', fontStyle: 'italic' }}>
            No champions yet.
          </div>
        )}
      </div>

      <div className="sidebar-section">
        <span>Chronicles</span>
        <button
          onClick={props.onNewConversation}
          disabled={!props.activeAgent}
          title="Begin a new chronicle"
        >
          +
        </button>
      </div>
      <div className="sidebar-list conversations">
        {props.conversations.map((c) => (
          <div
            key={c.id}
            className={`convo-item ${props.activeConversation?.id === c.id ? 'active' : ''}`}
            onClick={() => props.onSelectConversation(c)}
          >
            <span className="convo-title">{c.title || 'Untitled chronicle'}</span>
            <span className="convo-actions">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  props.onRenameConversation(c);
                }}
                title="Rename"
              >
                ✎
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  props.onDeleteConversation(c);
                }}
                title="Delete"
              >
                ✕
              </button>
            </span>
          </div>
        ))}
        {props.activeAgent && props.conversations.length === 0 && (
          <div style={{ padding: '8px 10px', fontSize: 12, color: 'var(--parchment-dark)', fontStyle: 'italic' }}>
            No chronicles yet. Begin one.
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        <span>v0.1 · Light be with you</span>
        <button onClick={props.onOpenSettings}>Settings</button>
      </div>
    </aside>
  );
}
