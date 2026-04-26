import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

interface Props {
  onSend: (content: string) => void;
  disabled?: boolean;
  busy?: boolean;
  placeholder?: string;
}

export function Composer({ onSend, disabled, busy, placeholder }: Props) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 220) + 'px';
  }, [value]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled || busy) return;
    onSend(trimmed);
    setValue('');
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="composer">
      <div className="composer-inner">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKey}
          placeholder={placeholder || 'Speak, hero...'}
          disabled={disabled}
          rows={1}
        />
        <button
          className="send-btn"
          onClick={submit}
          disabled={disabled || busy || !value.trim()}
          title="Send (Enter) — Shift+Enter for newline"
          aria-label="Send"
        >
          {busy ? (
            <span className="spinner" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12 L20 4 L13 20 L11 13 Z" />
            </svg>
          )}
        </button>
      </div>
      <div className="composer-meta">
        <span>Enter to send · Shift+Enter for newline</span>
        <span>By the Light, may your words ring true.</span>
      </div>
    </div>
  );
}
