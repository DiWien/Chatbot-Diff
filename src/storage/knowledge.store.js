import crypto from 'crypto';
import { readJson, writeJson } from './file.store.js';

const FILE = 'knowledge.json';
const TRAINING_FILE = 'training.json';

export function listKnowledge() {
  return readJson(FILE, []);
}

export function saveKnowledge(items) {
  return writeJson(FILE, items);
}

export function addKnowledge(item) {
  const items = listKnowledge();
  const now = new Date().toISOString();
  const next = { id: crypto.randomUUID(), createdAt: now, updatedAt: now, ...item };
  items.unshift(next);
  saveKnowledge(items);
  return next;
}

export function deleteKnowledge(id) {
  const next = listKnowledge().filter((item) => item.id !== id);
  saveKnowledge(next);
  return next;
}

export function updateKnowledge(id, patch) {
  const items = listKnowledge();
  const next = items.map((item) => (item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item));
  saveKnowledge(next);
  return next.find((item) => item.id === id);
}

export function listTrainingChunks() {
  return readJson(TRAINING_FILE, []);
}

export function saveTrainingChunks(chunks) {
  return writeJson(TRAINING_FILE, chunks);
}

export function clearTrainingChunks() {
  return writeJson(TRAINING_FILE, []);
}
