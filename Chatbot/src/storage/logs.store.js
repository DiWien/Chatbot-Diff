import crypto from 'crypto';
import { readJson, writeJson } from './file.store.js';

const FILE = 'logs.json';

export function listLogs() {
  return readJson(FILE, []);
}

export function addLog(entry) {
  const logs = listLogs();
  logs.unshift({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...entry });
  return writeJson(FILE, logs.slice(0, 500));
}
