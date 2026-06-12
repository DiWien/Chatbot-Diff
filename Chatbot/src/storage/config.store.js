import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { decryptSecret, encryptSecret, maskSecret } from '../services/crypto.service.js';
import { readJson, writeJson } from './file.store.js';

const FILE = 'config.json';
const DEFAULT_PROMPT = 'Bạn là Diff Coach, trợ lý AI của website Diff Gym. Trả lời bằng tiếng Việt, ngắn gọn, rõ ràng, thân thiện. Ưu tiên hỗ trợ về gym, bài tập, lịch tập, dinh dưỡng và cách sử dụng website. Nếu không có dữ liệu chắc chắn, hãy nói rõ là chưa có dữ liệu, không bịa thông tin.';

export async function ensureConfig() {
  const existing = readJson(FILE, null);
  if (existing) {
    let changed = false;
    existing.admin = existing.admin || {};
    if (!existing.admin.username) {
      existing.admin.username = env.ADMIN_USERNAME;
      changed = true;
    }
    if (env.ADMIN_PASSWORD === 'admin@123321') {
      existing.admin.passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
      changed = true;
    }
    return changed ? saveConfig(existing) : existing;
  }

  const apiKey = env.AI_PROVIDER === 'openai' ? env.OPENAI_API_KEY : env.GEMINI_API_KEY;
  const config = {
    admin: {
      username: env.ADMIN_USERNAME,
      email: env.ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(env.ADMIN_PASSWORD, 12),
    },
    ai: {
      provider: env.AI_PROVIDER,
      apiKeyEncrypted: encryptSecret(apiKey),
      model: env.AI_PROVIDER === 'openai' ? env.OPENAI_MODEL : env.GEMINI_MODEL,
      systemPrompt: DEFAULT_PROMPT,
      temperature: 0.3,
      maxTokens: 700,
      status: 'active',
      chatbotName: 'Diff Coach',
      welcomeMessage: 'Xin chào, tôi là Diff Coach. Bạn cần hỗ trợ gì về tập luyện hoặc dinh dưỡng?',
      lastTestAt: null,
      lastTestStatus: 'never',
    },
    security: {
      allowedOrigin: env.ALLOWED_ORIGIN,
      rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
      rateLimitMax: env.RATE_LIMIT_MAX,
    },
    stats: {
      totalQuestions: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return writeJson(FILE, config);
}

export function getConfig() {
  return readJson(FILE, {});
}

export function saveConfig(config) {
  return writeJson(FILE, { ...config, updatedAt: new Date().toISOString() });
}

export function getApiKey(config = getConfig()) {
  return decryptSecret(config.ai?.apiKeyEncrypted || '');
}

export function getSafeConfig() {
  const config = getConfig();
  const apiKey = getApiKey(config);
  return {
    provider: config.ai?.provider || 'gemini',
    model: config.ai?.model || 'gemini-2.5-flash',
    systemPrompt: config.ai?.systemPrompt || DEFAULT_PROMPT,
    temperature: Number(config.ai?.temperature ?? 0.3),
    maxTokens: Number(config.ai?.maxTokens ?? 700),
    status: config.ai?.status || 'active',
    chatbotName: config.ai?.chatbotName || 'Diff Coach',
    welcomeMessage: config.ai?.welcomeMessage || '',
    allowedOrigin: config.security?.allowedOrigin || env.ALLOWED_ORIGIN,
    rateLimitWindowMs: config.security?.rateLimitWindowMs || env.RATE_LIMIT_WINDOW_MS,
    rateLimitMax: config.security?.rateLimitMax || env.RATE_LIMIT_MAX,
    apiKeyMask: maskSecret(apiKey),
    hasApiKey: Boolean(apiKey),
    lastTestAt: config.ai?.lastTestAt || null,
    lastTestStatus: config.ai?.lastTestStatus || 'never',
  };
}

export function updateAiConfig(input) {
  const config = getConfig();
  const currentKey = getApiKey(config);
  const nextKey = typeof input.apiKey === 'string' && input.apiKey.trim() ? input.apiKey.trim() : currentKey;

  config.ai = {
    ...config.ai,
    provider: input.provider || config.ai.provider,
    apiKeyEncrypted: encryptSecret(nextKey),
    model: input.model || config.ai.model,
    systemPrompt: input.systemPrompt || config.ai.systemPrompt,
    temperature: Number(input.temperature ?? config.ai.temperature),
    maxTokens: Number(input.maxTokens ?? config.ai.maxTokens),
    status: input.status || config.ai.status,
    chatbotName: input.chatbotName || config.ai.chatbotName,
    welcomeMessage: input.welcomeMessage || config.ai.welcomeMessage,
  };

  config.security = {
    ...config.security,
    allowedOrigin: input.allowedOrigin || config.security.allowedOrigin,
  };

  return saveConfig(config);
}

export async function updateAdminCredentials(email, password) {
  const config = getConfig();
  config.admin.email = email || config.admin.email;
  if (password) config.admin.passwordHash = await bcrypt.hash(password, 12);
  return saveConfig(config);
}

export function clearApiKey() {
  const config = getConfig();
  config.ai.apiKeyEncrypted = '';
  return saveConfig(config);
}

export function markConnectionTest(status) {
  const config = getConfig();
  config.ai.lastTestAt = new Date().toISOString();
  config.ai.lastTestStatus = status;
  return saveConfig(config);
}

export function incrementQuestionCount() {
  const config = getConfig();
  config.stats.totalQuestions = Number(config.stats.totalQuestions || 0) + 1;
  return saveConfig(config);
}

export { DEFAULT_PROMPT };
