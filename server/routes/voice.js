import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { VOICE_DIR } from '../paths.js';

const router = Router();
const VALID_EVENTS = ['ready', 'send', 'receive', 'error'];
const EXTS = ['.mp3', '.ogg', '.wav', '.m4a'];

function findClip(event) {
  for (const ext of EXTS) {
    const p = path.join(VOICE_DIR, `${event}${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

router.get('/', (_req, res) => {
  const status = {};
  for (const ev of VALID_EVENTS) {
    const p = findClip(ev);
    status[ev] = p ? path.basename(p) : null;
  }
  res.json({ dir: VOICE_DIR, clips: status });
});

router.get('/:event', (req, res) => {
  const ev = req.params.event;
  if (!VALID_EVENTS.includes(ev)) return res.status(400).end();
  const clip = findClip(ev);
  if (!clip) return res.status(404).end();
  res.sendFile(clip);
});

export default router;
