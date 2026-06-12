import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');
const isVercel = Boolean(process.env.VERCEL);
const runtimeDataDir = isVercel ? path.join('/tmp', 'chatbot-diff-data') : path.join(rootDir, 'data');
const runtimeUploadsDir = isVercel ? path.join('/tmp', 'chatbot-diff-uploads') : path.join(rootDir, 'uploads');

export const env = {
  PORT: Number(process.env.PORT || 3000),
  NODE_ENV: process.env.NODE_ENV || 'development',
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@diffgym.local',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin@123321',
  JWT_SECRET: process.env.JWT_SECRET || 'change_this_secret',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'change_this_32_char_key',
  AI_PROVIDER: process.env.AI_PROVIDER || 'gemini',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
  ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN || 'https://gym-diff.vercel.app',
  RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX || 30),
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  SUPABASE_CONFIG_TABLE: process.env.SUPABASE_CONFIG_TABLE || 'chatbot_config',
  VERCEL: isVercel,
  rootDir,
  dataDir: runtimeDataDir,
  uploadsDir: runtimeUploadsDir,
};

export const SYSTEM_VERSION = '1.2.0';
