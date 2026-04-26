import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ROOT_DIR = path.resolve(__dirname, '..');
export const CLIENT_DIST = path.join(ROOT_DIR, 'client', 'dist');

export const DATA_DIR =
  process.env.UTHERS_HAND_HOME || path.join(os.homedir(), '.uther_webui');
export const VOICE_DIR = path.join(DATA_DIR, 'voice');
export const PORTRAIT_DIR = path.join(DATA_DIR, 'portraits');
export const DB_PATH = path.join(DATA_DIR, 'data.db');

export function ensureDirs() {
  for (const dir of [DATA_DIR, VOICE_DIR, PORTRAIT_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
