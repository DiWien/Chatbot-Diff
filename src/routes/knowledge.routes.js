import express from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { requireAdmin } from '../middleware/auth.js';
import { listKnowledge } from '../storage/knowledge.store.js';
import { createDocumentFromUpload, createFaq, removeKnowledge, reindexKnowledge, validateUpload } from '../services/knowledge.service.js';
import { asyncHandler, ok } from '../utils/response.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination: env.uploadsDir,
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    try {
      validateUpload(file);
      cb(null, true);
    } catch (error) {
      cb(error);
    }
  },
});

router.use(requireAdmin);

router.get('/', (req, res) => ok(res, { items: listKnowledge() }));

router.post('/upload', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'FILE_REQUIRED', message: 'Vui lòng chọn file.' });
  ok(res, { item: createDocumentFromUpload(req.file) });
}));

router.post('/faq', asyncHandler(async (req, res) => ok(res, { item: createFaq(req.body || {}) })));

router.delete('/:id', (req, res) => ok(res, { items: removeKnowledge(req.params.id) }));

router.post('/:id/reindex', (req, res) => ok(res, { item: reindexKnowledge(req.params.id) }));

export default router;
