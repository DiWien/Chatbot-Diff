import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';

export function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function readJson(fileName, fallback) {
  ensureDir(env.dataDir);
  const filePath = path.join(env.dataDir, fileName);
  if (!fs.existsSync(filePath)) return fallback;

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

export function writeJson(fileName, data) {
  ensureDir(env.dataDir);
  const filePath = path.join(env.dataDir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return data;
}
