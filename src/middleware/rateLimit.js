import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const chatLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'RATE_LIMITED',
    reply: 'Bạn gửi quá nhiều tin nhắn. Vui lòng thử lại sau.',
  },
});
