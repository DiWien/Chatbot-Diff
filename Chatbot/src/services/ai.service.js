import { getApiKey, getConfig, getSafeConfig, incrementQuestionCount, markConnectionTest } from '../storage/config.store.js';
import { addLog } from '../storage/logs.store.js';
import { truncate } from '../utils/response.js';
import { searchRelevantChunks } from './training.service.js';
import { callGemini } from './gemini.service.js';
import { callOpenAI } from './openai.service.js';

export async function askAI({ message, userId, source, image }) {
  const start = Date.now();
  const profile = getProfileForSource(source);
  const safe = await getSafeConfig(profile);

  if (safe.status !== 'active') {
    return { reply: 'Chatbot hiện đang tạm tắt.', provider: safe.provider, model: safe.model, usedKnowledge: false, latency: 0 };
  }

  const chunks = searchRelevantChunks(message);
  const context = chunks.map((chunk, index) => `[${index + 1}] ${chunk.title}\n${chunk.content}`).join('\n\n');

  try {
    const result = await callProvider({ message, context, image });
    const reply = normalizeProviderResult(result);
    const latency = Date.now() - start;
    await incrementQuestionCount();
    addLog({ source: source || 'unknown', userId: userId || '', message: truncate(message), responseStatus: 'success', latency, error: '', tokens: reply.usage });
    return { reply: reply.text || 'Diff Coach chưa có dữ liệu chắc chắn để trả lời câu hỏi này.', provider: safe.provider, model: safe.model, usedKnowledge: chunks.length > 0, latency, usage: reply.usage };
  } catch (error) {
    const latency = Date.now() - start;
    addLog({ source: source || 'unknown', userId: userId || '', message: truncate(message), responseStatus: 'error', latency, error: safeErrorCode(error), errorDetail: truncate(error?.message || '') });
    throw Object.assign(error, { publicCode: safeErrorCode(error), latency });
  }
}

export async function testAIConnection(input = {}) {
  const profile = input.profile === 'nutrition' ? 'nutrition' : 'chat';
  try {
    const result = await callProvider({ message: 'Trả lời ngắn gọn: kết nối AI đã sẵn sàng.', context: '', override: input });
    const reply = normalizeProviderResult(result);
    await markConnectionTest('success', profile);
    return { status: 'success', quota: 'available', usage: reply.usage, reply: reply.text };
  } catch (error) {
    await markConnectionTest('failed', profile);
    throw error;
  }
}

function normalizeProviderResult(result) {
  if (typeof result === 'string') return { text: result, usage: emptyUsage() };
  return {
    text: result?.text || '',
    usage: { ...emptyUsage(), ...(result?.usage || {}) },
  };
}

function emptyUsage() {
  return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
}

async function callProvider({ message, context, image, override = {} }) {
  const profile = override.profile === 'nutrition' ? 'nutrition' : 'chat';
  const config = await getConfig();
  const safe = await getSafeConfig(profile);
  const provider = normalizeProvider(override.provider || safe.provider);
  const apiKey = String(override.apiKey || '').trim() || getApiKey(config, profile);
  const payload = {
    apiKey,
    model: override.model || safe.model,
    baseUrl: override.baseUrl || safe.baseUrl,
    systemPrompt: override.systemPrompt || safe.systemPrompt,
    temperature: Number(override.temperature ?? safe.temperature),
    maxTokens: Number(override.maxTokens ?? safe.maxTokens),
    message,
    context,
    image,
  };

  if (provider === 'openai' || provider === 'router' || provider === 'custom') return callOpenAIRouter(payload);
  return callGemini(payload);
}

function getProfileForSource(source) {
  return String(source || '').toLowerCase().includes('nutrition') ? 'nutrition' : 'chat';
}

async function callOpenAIRouter(payload) {
  const models = String(payload.model || '').split(',').map((item) => item.trim()).filter(Boolean);
  let lastError;
  for (const model of models.length ? models : [payload.model]) {
    try {
      return await callOpenAI({ ...payload, model });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || Object.assign(new Error('No router model configured.'), { code: 'ROUTER_MODEL_REQUIRED' });
}

function normalizeProvider(provider) {
  const value = String(provider || 'gemini').toLowerCase();
  if (value.includes('openai')) return 'openai';
  if (value.includes('router') || value.includes('openrouter') || value.includes('9router') || value.includes('kilo')) return 'router';
  if (value.includes('custom')) return 'custom';
  return 'gemini';
}

export function safeErrorCode(error) {
  const status = error?.status || error?.statusCode;
  const message = String(error?.message || '').toLowerCase();
  if (status === 401 || status === 403 || message.includes('api key') || message.includes('permission')) return 'AI_AUTH_ERROR';
  if (message.includes('missing') && message.includes('api key')) return 'AI_AUTH_ERROR';
  if (status === 429 || message.includes('quota') || message.includes('rate limit')) return 'AI_QUOTA_ERROR';
  if (message.includes('timeout') || message.includes('abort')) return 'AI_TIMEOUT';
  return error?.code || 'AI_ERROR';
}

export function publicReplyForError(code) {
  if (code === 'AI_AUTH_ERROR') return 'Server chatbot chưa xác thực được với AI provider. Vui lòng kiểm tra API key.';
  if (code === 'AI_QUOTA_ERROR') return 'Diff Coach đang hết quota hoặc bị giới hạn tần suất. Vui lòng thử lại sau.';
  if (code === 'AI_TIMEOUT') return 'Diff Coach phản hồi quá lâu. Vui lòng thử lại sau.';
  return 'Diff Coach chưa thể trả lời lúc này do lỗi từ dịch vụ AI.';
}
