import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/agent/:agentId', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM conversations WHERE agent_id = ? ORDER BY updated_at DESC')
    .all(Number(req.params.agentId));
  res.json(rows);
});

router.post('/', (req, res) => {
  const { agent_id, title } = req.body || {};
  if (!agent_id) return res.status(400).json({ error: 'agent_id required' });
  const info = db
    .prepare('INSERT INTO conversations (agent_id, title) VALUES (?, ?)')
    .run(agent_id, title || 'New conversation');
  const row = db.prepare('SELECT * FROM conversations WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

router.patch('/:id', (req, res) => {
  const id = Number(req.params.id);
  const { title } = req.body || {};
  if (typeof title !== 'string') return res.status(400).json({ error: 'title required' });
  db.prepare('UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?').run(title, Date.now(), id);
  const row = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
  res.json(row);
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM conversations WHERE id = ?').run(Number(req.params.id));
  res.status(204).end();
});

router.get('/:id/messages', (req, res) => {
  const id = Number(req.params.id);
  const rows = db
    .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY id ASC')
    .all(id);
  res.json(rows);
});

export default router;
