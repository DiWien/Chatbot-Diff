import crypto from 'crypto';
import { listKnowledge, listTrainingChunks, saveKnowledge, saveTrainingChunks, clearTrainingChunks } from '../storage/knowledge.store.js';

export function splitIntoChunks(text, size = 900, overlap = 120) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const chunks = [];
  for (let i = 0; i < words.length; i += size - overlap) {
    chunks.push(words.slice(i, i + size).join(' '));
  }
  return chunks.filter(Boolean);
}

export function processDocuments() {
  const items = listKnowledge();
  const chunks = [];
  const now = new Date().toISOString();

  const nextItems = items.map((item) => {
    if (item.status === 'inactive') return item;
    const text = item.text || item.answer || '';
    const parts = splitIntoChunks(text);
    parts.forEach((content, index) => {
      chunks.push({
        id: crypto.randomUUID(),
        knowledgeId: item.id,
        title: item.title,
        source: item.source || item.type,
        category: item.category || 'general',
        content,
        index,
        created_at: now,
        updated_at: now,
      });
    });
    return { ...item, status: 'processed', chunkCount: parts.length, updatedAt: now };
  });

  saveKnowledge(nextItems);
  saveTrainingChunks(chunks);
  return { totalChunks: chunks.length };
}

export function rebuildIndex() {
  clearTrainingChunks();
  return processDocuments();
}

export function clearTrainingData() {
  clearTrainingChunks();
  const items = listKnowledge().map((item) => ({ ...item, chunkCount: 0, status: item.type === 'faq' ? 'active' : 'uploaded' }));
  saveKnowledge(items);
  return { totalChunks: 0 };
}

export function searchRelevantChunks(query, limit = 4) {
  const terms = String(query || '').toLowerCase().split(/\s+/).filter((term) => term.length > 2);
  if (!terms.length) return [];

  return listTrainingChunks()
    .map((chunk) => {
      const text = `${chunk.title} ${chunk.content}`.toLowerCase();
      const score = terms.reduce((total, term) => total + (text.includes(term) ? 1 : 0), 0);
      return { ...chunk, score };
    })
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function getTrainingStats() {
  return { totalChunks: listTrainingChunks().length };
}
