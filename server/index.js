import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { CLIENT_DIST, ensureDirs } from './paths.js';
import { authMiddleware, authRequired } from './auth.js';
import agentsRouter from './routes/agents.js';
import conversationsRouter from './routes/conversations.js';
import chatRouter from './routes/chat.js';
import voiceRouter from './routes/voice.js';

ensureDirs();

const app = express();
const PORT = Number(process.env.PORT || process.env.HERMES_WEBUI_PORT || 18888);
const HOST = process.env.HERMES_WEBUI_HOST || '0.0.0.0';

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/auth/status', (_req, res) => {
  res.json({ required: authRequired() });
});

app.use('/api', authMiddleware);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, app: "Uther's Hand" });
});

app.use('/api/agents', agentsRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/voice', voiceRouter);

if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

app.listen(PORT, HOST, () => {
  console.log(`[uthers-hand] listening on http://${HOST}:${PORT}`);
  if (authRequired()) console.log('[uthers-hand] password protection enabled');
  else console.log('[uthers-hand] no password set (HERMES_WEBUI_PASSWORD unset)');
});
