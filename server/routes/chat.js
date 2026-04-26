import { Router } from 'express';
import db from '../db.js';
import { runHermes } from '../hermes.js';

const router = Router();

function sseInit(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();
}

function sseSend(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

router.post('/:conversationId/messages', (req, res) => {
  const conversationId = Number(req.params.conversationId);
  const { content } = req.body || {};
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'content required' });
  }

  const conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId);
  if (!conv) return res.status(404).json({ error: 'conversation not found' });

  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(conv.agent_id);
  if (!agent) return res.status(404).json({ error: 'agent not found' });

  const userMsg = db
    .prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)')
    .run(conversationId, 'user', content);

  const userRow = db.prepare('SELECT * FROM messages WHERE id = ?').get(userMsg.lastInsertRowid);

  if (conv.title === 'New conversation') {
    const newTitle = content.replace(/\s+/g, ' ').trim().slice(0, 60) || 'New conversation';
    db.prepare('UPDATE conversations SET title = ? WHERE id = ?').run(newTitle, conversationId);
  }
  db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(Date.now(), conversationId);

  sseInit(res);
  sseSend(res, 'user-message', userRow);

  const controller = new AbortController();
  req.on('close', () => controller.abort());

  let assembled = '';
  let finished = false;

  const finalize = (status, payload = {}) => {
    if (finished) return;
    finished = true;
    if (status === 'done') {
      const ins = db
        .prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)')
        .run(conversationId, 'assistant', assembled);
      const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(ins.lastInsertRowid);
      db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(Date.now(), conversationId);
      sseSend(res, 'assistant-message', row);
    } else if (status === 'error') {
      sseSend(res, 'error', payload);
    }
    sseSend(res, 'done', { status });
    res.end();
  };

  try {
    runHermes({
      template: agent.command_template,
      profile: agent.profile,
      message: content,
      signal: controller.signal,
      onChunk: (chunk) => {
        assembled += chunk;
        sseSend(res, 'chunk', { delta: chunk });
      },
      onDone: () => finalize('done'),
      onError: (err) => finalize('error', { message: err.message || String(err) }),
    });
  } catch (err) {
    finalize('error', { message: err.message || String(err) });
  }
});

export default router;
