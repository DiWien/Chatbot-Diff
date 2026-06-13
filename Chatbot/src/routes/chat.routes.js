import express from 'express';
import { SYSTEM_VERSION } from '../config/env.js';
import { chatLimiter } from '../middleware/rateLimit.js';
import { getSafeConfig } from '../storage/config.store.js';
import { askAI, publicReplyForError } from '../services/ai.service.js';
import { asyncHandler } from '../utils/response.js';

const router = express.Router();

router.get('/health', asyncHandler(async (req, res) => {
  const config = await getSafeConfig();
  res.json({ status: 'ok', service: 'Chatbot Diff API', provider: config.provider, model: config.model, version: SYSTEM_VERSION, timestamp: new Date().toISOString() });
}));

router.get('/public-config', asyncHandler(async (req, res) => {
  const config = await getSafeConfig();
  res.json({ botName: config.chatbotName, welcomeMessage: config.welcomeMessage, status: config.status });
}));

router.post('/chat', chatLimiter, asyncHandler(async (req, res) => {
  const { message, userId, source } = req.body || {};
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ success: false, error: 'MESSAGE_REQUIRED', reply: 'Vui lòng nhập câu hỏi để Diff Coach hỗ trợ bạn.' });
  }

  try {
    const result = await askAI({ message: message.trim(), userId, source });
    return res.json({ success: true, reply: result.reply, meta: { provider: result.provider, model: result.model, latency: result.latency, usedKnowledge: result.usedKnowledge } });
  } catch (error) {
    const code = error.publicCode || 'AI_ERROR';
    const config = await getSafeConfig();
    return res.status(code === 'AI_QUOTA_ERROR' ? 429 : code === 'AI_AUTH_ERROR' ? 400 : 502).json({
      success: false,
      error: code,
      reply: publicReplyForError(code),
      meta: { provider: config.provider, model: config.model, latency: error.latency || 0, usedKnowledge: false },
    });
  }
}));

export default router;
