import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { decryptSecret, encryptSecret, maskSecret } from '../services/crypto.service.js';
import { readJson, writeJson } from './file.store.js';
import { hasSupabaseStorage, readSupabaseConfig, writeSupabaseConfig } from './supabase.store.js';

const FILE = 'config.json';
const DEFAULT_PROMPT = 'Bạn là Diff Coach, trợ lý AI của website Diff Gym. Trả lời bằng tiếng Việt, ngắn gọn, rõ ràng, thân thiện. Ưu tiên hỗ trợ về gym, bài tập, lịch tập, dinh dưỡng và cách sử dụng website. Nếu không có dữ liệu chắc chắn, hãy nói rõ là chưa có dữ liệu, không bịa thông tin.';
let memoryConfig = null;

export async function ensureConfig() {
  const existing = await getConfig();
  if (existing?.admin && existing?.ai && existing?.security) {
    const migrated = await migrateConfig(existing);
    if (migrated.changed) return saveConfig(migrated.config);
    return existing;
  }

  const config = await createDefaultConfig();
  return saveConfig(config);
}

async function createDefaultConfig() {
  const apiKey = env.AI_PROVIDER === 'openai' ? env.OPENAI_API_KEY : env.GEMINI_API_KEY;
  return {
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
    stats: { totalQuestions: 0 },
    runtimeData: { logs: [], knowledge: [], trainingChunks: [] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function migrateConfig(config) {
  let changed = false;
  config.admin = config.admin || {};
  config.ai = config.ai || {};
  config.security = config.security || {};
  config.stats = config.stats || { totalQuestions: 0 };
  config.runtimeData = config.runtimeData || { logs: [], knowledge: [], trainingChunks: [] };

  if (!config.admin.username) {
    config.admin.username = env.ADMIN_USERNAME;
    changed = true;
  }

  if (!config.admin.email) {
    config.admin.email = env.ADMIN_EMAIL;
    changed = true;
  }

  if (!config.admin.passwordHash) {
    config.admin.passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
    changed = true;
  }

  if (!config.ai.status) {
    config.ai.status = 'active';
    changed = true;
  }

  if (!config.security.allowedOrigin) {
    config.security.allowedOrigin = env.ALLOWED_ORIGIN;
    changed = true;
  }

  return { config, changed };
}

export async function getConfig() {
  if (hasSupabaseStorage()) {
    try {
      const supabaseConfig = await readSupabaseConfig();
      if (supabaseConfig) {
        memoryConfig = supabaseConfig;
        return supabaseConfig;
      }
    } catch (error) {
      console.error('Supabase config read failed, using fallback config:', safeError(error));
    }
  }

  const localConfig = readJson(FILE, null);
  if (localConfig) {
    memoryConfig = localConfig;
    return localConfig;
  }

  if (memoryConfig) return memoryConfig;
  return {};
}

export function getConfigSync() {
  return memoryConfig || readJson(FILE, {});
}

export async function saveConfig(config) {
  const next = { ...config, updatedAt: new Date().toISOString() };
  memoryConfig = next;
  if (hasSupabaseStorage()) {
    try {
      await writeSupabaseConfig(next);
    } catch (error) {
      console.error('Supabase config write failed, using runtime fallback only:', safeError(error));
      next.storageWarning = 'SUPABASE_WRITE_FAILED';
    }
  }
  return writeJson(FILE, next);
}

export function getApiKey(config = getConfigSync()) {
  try {
    return decryptSecret(config.ai?.apiKeyEncrypted || '');
  } catch (error) {
    console.error('Could not decrypt AI API key:', safeError(error));
    return '';
  }
}

export function toSafeConfig(config = getConfigSync()) {
  const apiKey = getApiKey(config);
  return {
    provider: config.ai?.provider || 'gemini',
    model: config.ai?.model || 'gemini-2.5-flash',
    systemPrompt: config.ai?.systemPrompt || DEFAULT_PROMPT,
    temperature: Number(config.ai?.temperature ?? 0.3),
    maxTokens: Number(config.ai?.maxTokens ?? 700),
    status: config.ai?.status || 'active',
    chatbotName: config.ai?.chatbotName || 'Diff Coach',
    welcomeMessage: config.ai?.welcomeMessage || 'Xin chào, tôi là Diff Coach. Bạn cần hỗ trợ gì về tập luyện hoặc dinh dưỡng?',
    allowedOrigin: config.security?.allowedOrigin || env.ALLOWED_ORIGIN,
    rateLimitWindowMs: config.security?.rateLimitWindowMs || env.RATE_LIMIT_WINDOW_MS,
    rateLimitMax: config.security?.rateLimitMax || env.RATE_LIMIT_MAX,
    apiKeyMask: maskSecret(apiKey),
    hasApiKey: Boolean(apiKey),
    lastTestAt: config.ai?.lastTestAt || null,
    lastTestStatus: config.ai?.lastTestStatus || 'never',
  };
}

export async function getSafeConfig() {
  return toSafeConfig(await getConfig());
}

export function getSafeConfigSync() {
  return toSafeConfig(getConfigSync());
}

export async function updateAiConfig(input) {
  const config = await getConfig();
  config.ai = config.ai || {};
  config.security = config.security || {};
  const currentKey = getApiKey(config);
  const nextKey = typeof input.apiKey === 'string' && input.apiKey.trim() ? input.apiKey.trim() : currentKey;

  config.ai = {
    ...config.ai,
    provider: input.provider || config.ai.provider || 'gemini',
    apiKeyEncrypted: encryptSecret(nextKey),
    model: input.model || config.ai.model || 'gemini-2.5-flash',
    systemPrompt: input.systemPrompt || config.ai.systemPrompt || DEFAULT_PROMPT,
    temperature: Number(input.temperature ?? config.ai.temperature ?? 0.3),
    maxTokens: Number(input.maxTokens ?? config.ai.maxTokens ?? 700),
    status: String(input.status || config.ai.status || 'active').toLowerCase(),
    chatbotName: input.chatbotName || config.ai.chatbotName || 'Diff Coach',
    welcomeMessage: input.welcomeMessage || config.ai.welcomeMessage || 'Xin chào, tôi là Diff Coach. Bạn cần hỗ trợ gì về tập luyện hoặc dinh dưỡng?',
  };

  config.security = {
    ...config.security,
    allowedOrigin: input.allowedOrigin || config.security.allowedOrigin || env.ALLOWED_ORIGIN,
  };

  return saveConfig(config);
}

export async function updateAdminCredentials(email, password) {
  const config = await getConfig();
  config.admin = config.admin || {};
  config.admin.email = email || config.admin.email || env.ADMIN_EMAIL;
  if (password) config.admin.passwordHash = await bcrypt.hash(password, 12);
  return saveConfig(config);
}

export async function clearApiKey() {
  const config = await getConfig();
  config.ai = config.ai || {};
  config.ai.apiKeyEncrypted = '';
  return saveConfig(config);
}

export async function markConnectionTest(status) {
  const config = await getConfig();
  config.ai = config.ai || {};
  config.ai.lastTestAt = new Date().toISOString();
  config.ai.lastTestStatus = status;
  return saveConfig(config);
}

export async function incrementQuestionCount() {
  const config = await getConfig();
  config.stats = config.stats || {};
  config.stats.totalQuestions = Number(config.stats.totalQuestions || 0) + 1;
  return saveConfig(config);
}

export function getRuntimeData() {
  const config = getConfigSync();
  config.runtimeData = config.runtimeData || { logs: [], knowledge: [], trainingChunks: [] };
  return config.runtimeData;
}

export function saveRuntimeData(patch) {
  const config = getConfigSync();
  config.runtimeData = { logs: [], knowledge: [], trainingChunks: [], ...(config.runtimeData || {}), ...patch };
  void saveConfig(config);
  return config.runtimeData;
}

function safeError(error) {
  return { name: error?.name, message: error?.message };
}

export { DEFAULT_PROMPT };
