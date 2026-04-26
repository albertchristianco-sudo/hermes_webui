import { useEffect, useState } from 'react';
import { api } from '../api';
import type { VoiceStatus } from '../types';
import { Modal } from './Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  voiceEnabled: boolean;
  setVoiceEnabled: (v: boolean) => void;
  onResetPassword?: () => void;
}

const EVENTS: Array<keyof VoiceStatus['clips']> = ['ready', 'send', 'receive', 'error'];

export function SettingsModal({ open, onClose, voiceEnabled, setVoiceEnabled, onResetPassword }: Props) {
  const [voice, setVoice] = useState<VoiceStatus | null>(null);

  useEffect(() => {
    if (!open) return;
    api.voiceStatus().then(setVoice).catch(() => setVoice(null));
  }, [open]);

  return (
    <Modal
      open={open}
      title="Settings"
      onClose={onClose}
      footer={
        <>
          <span />
          <button className="btn" onClick={onClose}>
            Done
          </button>
        </>
      }
    >
      <div className="field">
        <label>Paladin voice lines</label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', textTransform: 'none', letterSpacing: 0 }}>
          <input
            type="checkbox"
            checked={voiceEnabled}
            onChange={(e) => setVoiceEnabled(e.target.checked)}
          />
          Play voice clips on chat events
        </label>
        <span className="field-hint">
          Drop your own audio clips into{' '}
          <code>{voice?.dir || '~/.uther_webui/voice/'}</code> named
          <code> ready.mp3</code>, <code>send.mp3</code>, <code>receive.mp3</code>,
          <code> error.mp3</code> (or .ogg/.wav/.m4a). Blizzard owns the originals — supply
          your own files.
        </span>
        <div style={{ marginTop: 8 }}>
          {EVENTS.map((ev) => {
            const file = voice?.clips[ev];
            return (
              <div className="voice-row" key={ev}>
                <span>{ev}</span>
                <span className={`voice-status ${file ? 'have' : 'miss'}`}>
                  {file || 'not found'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {onResetPassword && (
        <div className="field">
          <label>Session</label>
          <button className="btn ghost" onClick={onResetPassword}>
            Sign out (forget password on this device)
          </button>
        </div>
      )}
    </Modal>
  );
}
