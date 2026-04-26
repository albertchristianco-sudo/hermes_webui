import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import db from '../db.js';
import { PORTRAIT_DIR } from '../paths.js';

const router = Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: PORTRAIT_DIR,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '') || '.png';
      cb(null, `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    },
  }),
  limits: { fileSize: 4 * 1024 * 1024 },
});

const DEFAULT_TEMPLATE = 'hermes -p {profile} chat -Q -q {message}';

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM agents ORDER BY created_at ASC').all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { name, profile, command_template, accent, tagline } = req.body || {};
  if (!name || !profile) return res.status(400).json({ error: 'name and profile required' });
  const stmt = db.prepare(
    `INSERT INTO agents (name, profile, command_template, accent, tagline)
     VALUES (?, ?, ?, ?, ?)`
  );
  const info = stmt.run(
    name,
    profile,
    command_template || DEFAULT_TEMPLATE,
    accent || '#d4a23a',
    tagline || null
  );
  const row = db.prepare('SELECT * FROM agents WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

router.patch('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const fields = ['name', 'profile', 'command_template', 'accent', 'tagline'];
  const updates = [];
  const values = [];
  for (const f of fields) {
    if (Object.prototype.hasOwnProperty.call(req.body || {}, f)) {
      updates.push(`${f} = ?`);
      values.push(req.body[f]);
    }
  }
  if (updates.length === 0) return res.json(existing);
  values.push(id);
  db.prepare(`UPDATE agents SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  const row = db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
  res.json(row);
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM agents WHERE id = ?').run(id);
  res.status(204).end();
});

router.post('/:id/portrait', upload.single('portrait'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
  if (!existing) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(404).json({ error: 'not found' });
  }
  if (!req.file) return res.status(400).json({ error: 'no file' });
  if (existing.portrait_path) {
    const oldPath = path.join(PORTRAIT_DIR, existing.portrait_path);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }
  db.prepare('UPDATE agents SET portrait_path = ? WHERE id = ?').run(req.file.filename, id);
  const row = db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
  res.json(row);
});

router.get('/:id/portrait', (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT portrait_path FROM agents WHERE id = ?').get(id);
  if (!row || !row.portrait_path) return res.status(404).end();
  res.sendFile(path.join(PORTRAIT_DIR, row.portrait_path));
});

export default router;
