import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Agent } from '../types';
import { Modal } from './Modal';

interface Props {
  open: boolean;
  agent: Agent | null;
  onClose: () => void;
  onSaved: (agent: Agent) => void;
  onDeleted?: (id: number) => void;
}

const DEFAULT_TEMPLATE = 'hermes -p {profile} chat -Q -q {message}';

const FIRST_RUN_DEFAULTS = {
  name: 'Uther Lightbringer',
  profile: 'uther',
  command_template: DEFAULT_TEMPLATE,
  accent: '#d4a23a',
  tagline: 'Paladin of the Silver Hand',
};

export function AgentEditor({ open, agent, onClose, onSaved, onDeleted }: Props) {
  const editing = !!agent;
  const [name, setName] = useState('');
  const [profile, setProfile] = useState('');
  const [tagline, setTagline] = useState('');
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [accent, setAccent] = useState('#d4a23a');
  const [portrait, setPortrait] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (agent) {
      setName(agent.name);
      setProfile(agent.profile);
      setTagline(agent.tagline || '');
      setTemplate(agent.command_template || DEFAULT_TEMPLATE);
      setAccent(agent.accent || '#d4a23a');
    } else {
      setName(FIRST_RUN_DEFAULTS.name);
      setProfile(FIRST_RUN_DEFAULTS.profile);
      setTagline(FIRST_RUN_DEFAULTS.tagline);
      setTemplate(FIRST_RUN_DEFAULTS.command_template);
      setAccent(FIRST_RUN_DEFAULTS.accent);
    }
    setPortrait(null);
    setErr(null);
  }, [open, agent]);

  const submit = async () => {
    setErr(null);
    if (!name.trim() || !profile.trim()) {
      setErr('Name and profile are required.');
      return;
    }
    if (!template.includes('{message}')) {
      setErr('Command template must include {message}.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        profile: profile.trim(),
        command_template: template.trim(),
        accent,
        tagline: tagline.trim() || null,
      };
      let saved = agent
        ? await api.updateAgent(agent.id, payload)
        : await api.createAgent(payload);
      if (portrait) {
        saved = await api.uploadPortrait(saved.id, portrait);
      }
      onSaved(saved);
      onClose();
    } catch (e: any) {
      setErr(e.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!agent) return;
    if (!confirm(`Remove ${agent.name}? This deletes their conversations.`)) return;
    setSaving(true);
    try {
      await api.deleteAgent(agent.id);
      onDeleted?.(agent.id);
      onClose();
    } catch (e: any) {
      setErr(e.message || 'Failed to delete.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={editing ? 'Edit champion' : 'Summon a champion'}
      onClose={onClose}
      closable={editing || true}
      footer={
        <>
          {editing && onDeleted ? (
            <button className="btn danger" onClick={remove} disabled={saving}>
              Banish
            </button>
          ) : (
            <span />
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button className="btn" onClick={submit} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save' : 'Summon'}
            </button>
          </div>
        </>
      }
    >
      {err && <div className="bubble error">{err}</div>}

      <div className="field-row">
        <div className="field">
          <label>Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>Hermes profile</label>
          <input
            type="text"
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            placeholder="uther"
          />
        </div>
      </div>

      <div className="field">
        <label>Tagline</label>
        <input
          type="text"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="Paladin of the Silver Hand"
        />
      </div>

      <div className="field">
        <label>Command template</label>
        <textarea
          rows={2}
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
        />
        <span className="field-hint">
          Tokens <code>{'{profile}'}</code> and <code>{'{message}'}</code> are substituted. The
          binary must accept the message as the final argument.
        </span>
      </div>

      <div className="field-row">
        <div className="field" style={{ flex: '0 0 120px' }}>
          <label>Accent</label>
          <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} />
        </div>
        <div className="field">
          <label>Portrait</label>
          <div className="portrait-uploader">
            <div className="preview">
              {portrait ? (
                <img src={URL.createObjectURL(portrait)} alt="" />
              ) : agent?.portrait_path ? (
                <img src={`/api/agents/${agent.id}/portrait`} alt="" />
              ) : (
                <img src="/sigil.svg" alt="" />
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPortrait(e.target.files?.[0] || null)}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
