import { useCallback, useEffect, useRef } from 'react';
import { getStoredPassword } from '../api';

const VOICE_KEY = 'uthers-hand-voice-enabled';

export type VoiceEvent = 'ready' | 'send' | 'receive' | 'error';

export function useVoiceEnabled(): [boolean, (v: boolean) => void] {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(VOICE_KEY) : null;
  const initial = stored ? stored === 'true' : false;
  const enabledRef = useRef(initial);
  const setEnabled = useCallback((v: boolean) => {
    enabledRef.current = v;
    if (typeof localStorage !== 'undefined') localStorage.setItem(VOICE_KEY, String(v));
    window.dispatchEvent(new Event('voice-enabled-changed'));
  }, []);
  return [initial, setEnabled];
}

export function useVoice() {
  const cacheRef = useRef<Record<string, HTMLAudioElement | null>>({});

  const play = useCallback((event: VoiceEvent) => {
    if (typeof localStorage === 'undefined') return;
    if (localStorage.getItem(VOICE_KEY) !== 'true') return;
    let audio = cacheRef.current[event];
    if (audio === null) return;
    if (!audio) {
      const pw = getStoredPassword();
      const url = `/api/voice/${event}${pw ? `?token=${encodeURIComponent(pw)}` : ''}`;
      audio = new Audio(url);
      audio.addEventListener('error', () => {
        cacheRef.current[event] = null;
      });
      cacheRef.current[event] = audio;
    }
    try {
      audio.currentTime = 0;
      void audio.play().catch(() => {});
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const reset = () => {
      cacheRef.current = {};
    };
    window.addEventListener('voice-enabled-changed', reset);
    return () => window.removeEventListener('voice-enabled-changed', reset);
  }, []);

  return play;
}
