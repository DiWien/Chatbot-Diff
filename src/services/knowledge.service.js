import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';
import { addKnowledge, deleteKnowledge, listKnowledge, updateKnowledge } from '../storage/knowledge.store.js';

const ALLOWED_EXTENSIONS = new Set(['.txt', '.md', '.pdf', '.docx', '.json', '.csv']);

export function validateUpload(file) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw Object.assign(new Error('File không được hỗ trợ.'), { statusCode: 400 });
  }
}

export function createDocumentFromUpload(file) {
  validateUpload(file);
  const ext = path.extname(file.originalname).toLowerCase();
  const text = extractText(file.path, ext);
  return addKnowledge({
    type: 'document',
    title: file.originalname,
    fileName: file.filename,
    mimeType: file.mimetype,
    extension: ext,
    size: file.size,
    status: text ? 'uploaded' : 'needs_parser',
    chunkCount: 0,
    source: file.path,
    text,
  });
}

export function createFaq({ question, answer, category, active }) {
  if (!question?.trim() || !answer?.trim()) {
    throw Object.assign(new Error('FAQ cần có câu hỏi và câu trả lời.'), { statusCode: 400 });
  }

  return addKnowledge({
    type: 'faq',
    title: question.trim(),
    question: question.trim(),
    answer: answer.trim(),
    category: category || 'general',
    status: active === false ? 'inactive' : 'active',
    chunkCount: 0,
    text: `Câu hỏi: ${question.trim()}\nCâu trả lời: ${answer.trim()}`,
  });
}

export function removeKnowledge(id) {
  return deleteKnowledge(id);
}

export function reindexKnowledge(id) {
  return updateKnowledge(id, { status: 'queued' });
}

export function getKnowledgeStats() {
  const items = listKnowledge();
  return {
    total: items.length,
    active: items.filter((item) => item.status === 'active' || item.status === 'uploaded' || item.status === 'processed').length,
  };
}

function extractText(filePath, ext) {
  if (['.txt', '.md', '.json', '.csv'].includes(ext)) {
    return fs.readFileSync(filePath, 'utf8');
  }

  return '';
}
