import { getApiKey, getConfig, getSafeConfig, incrementQuestionCount, markConnectionTest } from '../storage/config.store.js';
import { addLog } from '../storage/logs.store.js';
import { truncate } from '../utils/response.js';
import { searchRelevantChunks } from './training.service.js';
import { callGemini } from './gemini.service.js';
import { callOpenAI } from './openai.service.js';

export async function askAI({ message, userId, source }) {
  const start = Date.now();
  const safe = getSafeConfig();

  if (safe.status !== 'active') {
    return { reply: 'Chatbot hiện đang tạm tắt.', provider: safe.provider, model: safe.model, usedKnowledge: false, latency: 0 };
  }

  const chunks = searchRelevantChunks(message);
  const context = chunks.map((chunk, index) => `[${index + 1}] ${chunk.title}\n${chunk.content}`).join('\n\n');

  try {
    const reply = await callProvider({ message, context });
    const latency = Date.now() - start;
    incrementQuestionCount();
    addLog({ source: source || 'unknown', userId: userId || '', message: truncate(message), responseStatus: 'success', latency, error: '' });
    return { reply: reply || 'Diff Coach chưa có dữ liệu chắc chắn để trả lời câu hỏi này.', provider: safe.provider, model: safe.model, usedKnowledge: chunks.length > 0, latency };
  } catch (error) {
    const latency = Date.now() - start;
    addLog({ source: source || 'unknown', userId: userId || '', message: truncate(message), responseStatus: 'error', latency, error: safeErrorCode(error) });
    throw Object.assign(error, { publicCode: safeErrorCode(error), latency });
  }
}

export async function testAIConnection() {
  try {
    await callProvider({ message: 'Trả lời ngắn gọn: kết nối AI đã sẵn sàng.', context: '' });
    markConnectionTest('success');
    return { status: 'success' };
  } catch (error) {
    markConnectionTest('failed');
    throw error;
  }
}

async function callProvider({ message, context }) {
  const config = getConfig();
  const safe = getSafeConfig();
  const payload = {
    apiKey: getApiKey(config),
    model: safe.model,
    systemPrompt: safe.systemPrompt,
    temperature: safe.temperature,
    maxTokens: safe.maxTokens,
    message,
    context,
  };

  if (safe.provider === 'openai') return callOpenAI(payload);
  if (safe.provider === 'custom') throw Object.assign(new Error('Custom API chưa được cấu hình.'), { code: 'CUSTOM_NOT_CONFIGURED' });
  return callGemini(payload);
}

export function safeErrorCode(error) {
  const status = error?.status || error?.statusCode;
  const message = String(error?.message || '').toLowerCase();
  if (status === 401 || status === 403 || message.includes('api key') || message.includes('permission')) return 'AI_AUTH_ERROR';
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
