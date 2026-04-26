import { useState } from 'react';
import { setStoredPassword } from '../api';
import { Modal } from './Modal';

interface Props {
  onAuthed: () => void;
}

export function PasswordGate({ onAuthed }: Props) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!pw) return;
    setBusy(true);
    setErr(null);
    setStoredPassword(pw);
    try {
      const res = await fetch('/api/health', { headers: { 'x-uthers-hand-password': pw } });
      if (res.status === 401) {
        setErr('That word is not the password.');
        setStoredPassword('');
      } else if (!res.ok) {
        setErr('Server unreachable.');
        setStoredPassword('');
      } else {
        onAuthed();
      }
    } catch (e: any) {
      setErr(e.message || 'Failed.');
      setStoredPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title="By the Light"
      onClose={() => {}}
      closable={false}
      footer={
        <>
          <span />
          <button className="btn" onClick={submit} disabled={busy || !pw}>
            {busy ? 'Verifying…' : 'Enter'}
          </button>
        </>
      }
    >
      <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--ink-soft)' }}>
        Speak the password, and the gates of Northshire shall open.
      </p>
      <div className="field">
        <label>Password</label>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          autoFocus
        />
      </div>
      {err && <div className="bubble error">{err}</div>}
    </Modal>
  );
}
