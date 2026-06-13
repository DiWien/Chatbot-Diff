import cors from 'cors';
import { env } from '../config/env.js';
import { getSafeConfigSync } from '../storage/config.store.js';

const DEFAULT_ALLOWED_ORIGINS = new Set([
  'https://gym-diff.vercel.app',
  'https://www.gym-diff.vercel.app',
  'https://chatbotdiff.vercel.app',
  'https://chatbot-diff.vercel.app',
]);

export const apiCors = cors({
  origin(origin, callback) {
    const config = getSafeConfigSync();
    const allowedOrigins = parseAllowedOrigins(config.allowedOrigin || env.ALLOWED_ORIGIN);

    if (!origin || isAllowedOrigin(origin, allowedOrigins)) {
      callback(null, true);
      return;
    }

    console.warn('Blocked CORS origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Client-Secret'],
});

function parseAllowedOrigins(value = '') {
  const origins = new Set(DEFAULT_ALLOWED_ORIGINS);
  String(value)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .forEach((origin) => origins.add(origin));
  return origins;
}

function isAllowedOrigin(origin, allowedOrigins) {
  if (allowedOrigins.has('*') || allowedOrigins.has(origin)) return true;

  try {
    const url = new URL(origin);
    const host = url.hostname.toLowerCase();
    return (
      host === 'gym-diff.vercel.app'
      || host === 'www.gym-diff.vercel.app'
      || (host.endsWith('.vercel.app') && host.includes('gym-diff'))
      || (host.endsWith('.vercel.app') && host.includes('gymdiff'))
      || (host.endsWith('.vercel.app') && host.includes('chatbotdiff'))
      || (host.endsWith('.vercel.app') && host.includes('chatbot-diff'))
      || host.endsWith('-diwien.vercel.app')
    );
  } catch {
    return false;
  }
}
