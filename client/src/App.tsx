import { useCallback, useEffect, useRef, useState } from 'react';
import { api, getStoredPassword, setStoredPassword, streamChat } from './api';
import type { Agent, Conversation, Message } from './types';
import { Sidebar } from './components/Sidebar';
import { AgentPortrait } from './components/AgentPortrait';
import { MessageBubble } from './components/MessageBubble';
import { Composer } from './components/Composer';
import { AgentEditor } from './components/AgentEditor';
import { SettingsModal } from './components/SettingsModal';
import { PasswordGate } from './components/PasswordGate';
import { useVoice, useVoiceEnabled } from './hooks/useVoice';

type Phase = 'loading' | 'auth' | 'ready';

interface Streaming {
  buffer: string;
  error: string | null;
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState<Streaming | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorAgent, setEditorAgent] = useState<Agent | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [voiceEnabled, setVoiceEnabledState] = useState(false);
  const [, setVoicePersisted] = useVoiceEnabled();
  const playVoice = useVoice();
  const [toast, setToast] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }, []);

  // Initial auth + bootstrap
  useEffect(() => {
    (async () => {
      try {
        const status = await api.authStatus();
        if (status.required && !getStoredPassword()) {
          setPhase('auth');
          return;
        }
        await bootstrap();
      } catch {
        setPhase('auth');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bootstrap = async () => {
    try {
      const list = await api.listAgents();
      setAgents(list);
      if (list.length === 0) {
        setEditorAgent(null);
        setEditorOpen(true);
      } else {
        const first = list[0];
        setActiveAgent(first);
      }
      setPhase('ready');
      // restore voice toggle
      const persisted = localStorage.getItem('uthers-hand-voice-enabled') === 'true';
      setVoiceEnabledState(persisted);
      if (persisted) playVoice('ready');
    } catch (e: any) {
      if (e.message === 'unauthorized') {
        setPhase('auth');
      } else {
        showToast(e.message || 'Failed to load.');
        setPhase('ready');
      }
    }
  };

  // Load conversations on agent change
  useEffect(() => {
    if (!activeAgent) {
      setConversations([]);
      setActiveConv(null);
      return;
    }
    api
      .listConversations(activeAgent.id)
      .then((list) => {
        setConversations(list);
        setActiveConv(list[0] || null);
      })
      .catch((e) => showToast(e.message));
  }, [activeAgent, showToast]);

  // Load messages on conversation change
  useEffect(() => {
    if (!activeConv) {
      setMessages([]);
      return;
    }
    api.listMessages(activeConv.id).then(setMessages).catch((e) => showToast(e.message));
  }, [activeConv, showToast]);

  // Auto-scroll on new content
  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  const handleVoiceToggle = (v: boolean) => {
    setVoiceEnabledState(v);
    setVoicePersisted(v);
  };

  const onAddAgent = () => {
    setEditorAgent(null);
    setEditorOpen(true);
  };
  const onEditAgent = (a: Agent) => {
    setEditorAgent(a);
    setEditorOpen(true);
  };

  const onAgentSaved = (saved: Agent) => {
    setAgents((prev) => {
      const idx = prev.findIndex((a) => a.id === saved.id);
      if (idx === -1) return [...prev, saved];
      const next = prev.slice();
      next[idx] = saved;
      return next;
    });
    setActiveAgent(saved);
  };

  const onAgentDeleted = (id: number) => {
    setAgents((prev) => prev.filter((a) => a.id !== id));
    if (activeAgent?.id === id) {
      const remaining = agents.filter((a) => a.id !== id);
      setActiveAgent(remaining[0] || null);
    }
  };

  const onNewConversation = async () => {
    if (!activeAgent) return;
    try {
      const conv = await api.createConversation(activeAgent.id);
      setConversations((prev) => [conv, ...prev]);
      setActiveConv(conv);
    } catch (e: any) {
      showToast(e.message);
    }
  };

  const onRenameConversation = async (c: Conversation) => {
    const next = prompt('Rename chronicle', c.title);
    if (next === null) return;
    try {
      const updated = await api.renameConversation(c.id, next.trim() || c.title);
      setConversations((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      if (activeConv?.id === updated.id) setActiveConv(updated);
    } catch (e: any) {
      showToast(e.message);
    }
  };

  const onDeleteConversation = async (c: Conversation) => {
    if (!confirm(`Delete "${c.title}"?`)) return;
    try {
      await api.deleteConversation(c.id);
      setConversations((prev) => prev.filter((x) => x.id !== c.id));
      if (activeConv?.id === c.id) {
        const remaining = conversations.filter((x) => x.id !== c.id);
        setActiveConv(remaining[0] || null);
      }
    } catch (e: any) {
      showToast(e.message);
    }
  };

  const send = async (content: string) => {
    if (!activeAgent) return;
    let conv = activeConv;
    if (!conv) {
      try {
        conv = await api.createConversation(activeAgent.id);
        setConversations((prev) => [conv!, ...prev]);
        setActiveConv(conv);
      } catch (e: any) {
        showToast(e.message);
        return;
      }
    }

    setStreaming({ buffer: '', error: null });
    playVoice('send');

    let firstChunk = true;
    try {
      await streamChat(conv.id, content, (ev) => {
        if (ev.type === 'user-message') {
          setMessages((prev) => [...prev, ev.message]);
        } else if (ev.type === 'chunk') {
          if (firstChunk) {
            playVoice('receive');
            firstChunk = false;
          }
          setStreaming((prev) =>
            prev ? { ...prev, buffer: prev.buffer + ev.delta } : { buffer: ev.delta, error: null }
          );
        } else if (ev.type === 'assistant-message') {
          setMessages((prev) => [...prev, ev.message]);
          setStreaming(null);
        } else if (ev.type === 'error') {
          setStreaming({ buffer: '', error: ev.message });
          playVoice('error');
        }
      });
    } catch (e: any) {
      setStreaming({ buffer: '', error: e.message || 'Stream failed' });
      playVoice('error');
    }

    // Refresh conversation title (if backend renamed)
    api
      .listConversations(activeAgent.id)
      .then((list) => {
        setConversations(list);
        const updated = list.find((c) => c.id === conv!.id);
        if (updated) setActiveConv(updated);
      })
      .catch(() => {});

    // Clear streaming buffer if we ended in success but no assistant-message arrived
    setStreaming((s) => (s && !s.error ? null : s));
  };

  if (phase === 'loading') {
    return (
      <div className="app">
        <main className="main">
          <div className="empty-hero">
            <span className="spinner" />
          </div>
        </main>
      </div>
    );
  }

  if (phase === 'auth') {
    return <PasswordGate onAuthed={() => bootstrap()} />;
  }

  return (
    <div className="app">
      <Sidebar
        agents={agents}
        activeAgent={activeAgent}
        onSelectAgent={setActiveAgent}
        onAddAgent={onAddAgent}
        onEditAgent={onEditAgent}
        conversations={conversations}
        activeConversation={activeConv}
        onSelectConversation={setActiveConv}
        onNewConversation={onNewConversation}
        onRenameConversation={onRenameConversation}
        onDeleteConversation={onDeleteConversation}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="main">
        {activeAgent ? (
          <header className="main-header">
            <AgentPortrait agent={activeAgent} />
            <div className="main-title">
              <h1>{activeAgent.name}</h1>
              <small>
                {activeAgent.tagline || 'Champion of the Light'} · profile:{' '}
                <code>{activeAgent.profile}</code>
              </small>
            </div>
            <div className="main-header-actions">
              <button
                className="icon-btn"
                onClick={() => onEditAgent(activeAgent)}
                title="Edit champion"
              >
                ✎
              </button>
            </div>
          </header>
        ) : (
          <header className="main-header">
            <div className="agent-portrait">
              <img src="/sigil.svg" alt="" />
            </div>
            <div className="main-title">
              <h1>Uther's Hand</h1>
              <small>Summon a champion to begin.</small>
            </div>
          </header>
        )}

        <div className="chat-pane" ref={chatRef}>
          <div className="chat-pane-inner">
            {!activeAgent ? (
              <div className="empty-hero">
                <h2>The hall stands empty.</h2>
                <p>Click + above the Champions list to summon one.</p>
              </div>
            ) : messages.length === 0 && !streaming ? (
              <div className="empty-hero">
                <h2>{activeAgent.name} awaits your word.</h2>
                <p>"{activeAgent.tagline || 'Speak, and the Light shall answer.'}"</p>
              </div>
            ) : (
              <>
                {messages.map((m) => (
                  <MessageBubble key={m.id} message={m} agent={activeAgent} />
                ))}
                {streaming && !streaming.error && (
                  <MessageBubble
                    message={{ role: 'assistant', content: streaming.buffer }}
                    agent={activeAgent}
                    streaming
                  />
                )}
                {streaming && streaming.error && (
                  <MessageBubble
                    message={{ role: 'assistant', content: `**The Light falters.** ${streaming.error}` }}
                    agent={activeAgent}
                    error
                  />
                )}
              </>
            )}
          </div>
        </div>

        <Composer
          onSend={send}
          disabled={!activeAgent}
          busy={!!streaming && !streaming.error}
          placeholder={
            activeAgent ? `Speak to ${activeAgent.name}…` : 'Summon a champion to begin'
          }
        />
      </main>

      <AgentEditor
        open={editorOpen}
        agent={editorAgent}
        onClose={() => setEditorOpen(false)}
        onSaved={onAgentSaved}
        onDeleted={editorAgent ? onAgentDeleted : undefined}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        voiceEnabled={voiceEnabled}
        setVoiceEnabled={handleVoiceToggle}
        onResetPassword={
          getStoredPassword()
            ? () => {
                setStoredPassword('');
                setSettingsOpen(false);
                setPhase('auth');
              }
            : undefined
        }
      />

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
