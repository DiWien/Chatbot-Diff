import crypto from 'crypto';
import { readJson, writeJson } from './file.store.js';
import { getRuntimeData, saveRuntimeData } from './config.store.js';

const FILE = 'logs.json';

export function listLogs() {
  const runtimeLogs = getRuntimeData().logs;
  return Array.isArray(runtimeLogs) && runtimeLogs.length ? runtimeLogs : readJson(FILE, []);
}

export function addLog(entry) {
  const logs = listLogs();
  logs.unshift({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...entry });
  const next = logs.slice(0, 500);
  saveRuntimeData({ logs: next });
  return writeJson(FILE, next);
}
