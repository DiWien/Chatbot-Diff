import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://gym-diff.vercel.app';

const SYSTEM_PROMPT = `Bạn là Diff Coach, trợ lý AI của website Diff Gym. Bạn trả lời bằng tiếng Việt, ngắn gọn, rõ ràng, thân thiện. Bạn hỗ trợ người dùng về tập luyện, bài tập, lịch tập, dinh dưỡng và sử dụng website Diff Gym. Nếu câu hỏi không có dữ liệu chắc chắn, hãy nói rõ là chưa có dữ liệu, không bịa thông tin.`;

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origin === ALLOWED_ORIGIN) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    optionsSuccessStatus: 204,
  }),
);

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Chatbot Diff API',
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Chatbot Diff API',
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/chat', async (req, res) => {
  const { message, userId, source } = req.body || {};

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({
      success: false,
      error: 'MESSAGE_REQUIRED',
      reply: 'Vui lòng nhập câu hỏi để Diff Coach hỗ trợ bạn.',
    });
  }

  if (source && source !== 'gym-diff') {
    return res.status(400).json({
      success: false,
      error: 'INVALID_SOURCE',
      reply: 'Nguồn yêu cầu không hợp lệ.',
    });
  }

  if (!genAI) {
    return res.status(500).json({
      success: false,
      error: 'GEMINI_API_KEY_MISSING',
      reply: 'Server chatbot chưa được cấu hình API key Gemini.',
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: SYSTEM_PROMPT,
    });

    const prompt = [
      'Thông tin request:',
      `- userId: ${typeof userId === 'string' && userId.trim() ? userId.trim() : 'anonymous'}`,
      `- source: ${source || 'gym-diff'}`,
      '',
      'Câu hỏi người dùng:',
      message.trim(),
    ].join('\n');

    const result = await model.generateContent(
      {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.6,
          topP: 0.9,
          maxOutputTokens: 800,
        },
      },
      { signal: controller.signal },
    );

    const reply = result.response.text().trim();

    return res.json({
      success: true,
      reply: reply || 'Diff Coach chưa có dữ liệu chắc chắn để trả lời câu hỏi này.',
    });
  } catch (error) {
    const status = getGeminiErrorStatus(error);

    console.error('Gemini request failed:', {
      name: error?.name,
      message: error?.message,
      status,
    });

    return res.status(status.httpStatus).json({
      success: false,
      error: status.code,
      reply: status.reply,
    });
  } finally {
    clearTimeout(timeout);
  }
});

app.use((err, req, res, next) => {
  if (err?.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      error: 'CORS_FORBIDDEN',
      reply: 'Domain này không được phép gọi Chatbot Diff API.',
    });
  }

  return next(err);
});

app.use((err, req, res, next) => {
  console.error('Unhandled server error:', {
    name: err?.name,
    message: err?.message,
  });

  res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    reply: 'Server chatbot đang gặp lỗi. Vui lòng thử lại sau.',
  });
});

function getGeminiErrorStatus(error) {
  const message = String(error?.message || '').toLowerCase();
  const status = error?.status || error?.statusCode;

  if (error?.name === 'AbortError' || message.includes('abort') || message.includes('timeout')) {
    return {
      httpStatus: 504,
      code: 'GEMINI_TIMEOUT',
      reply: 'Diff Coach phản hồi quá lâu. Vui lòng thử lại sau.',
    };
  }

  if (status === 401 || status === 403 || message.includes('api key') || message.includes('permission')) {
    return {
      httpStatus: 502,
      code: 'GEMINI_AUTH_ERROR',
      reply: 'Server chatbot chưa xác thực được với Gemini. Vui lòng kiểm tra API key.',
    };
  }

  if (status === 429 || message.includes('quota') || message.includes('rate limit')) {
    return {
      httpStatus: 429,
      code: 'GEMINI_QUOTA_EXCEEDED',
      reply: 'Diff Coach đang hết quota hoặc bị giới hạn tần suất. Vui lòng thử lại sau.',
    };
  }

  return {
    httpStatus: 502,
    code: 'GEMINI_API_ERROR',
    reply: 'Diff Coach chưa thể trả lời lúc này do lỗi từ dịch vụ AI.',
  };
}

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Chatbot Diff API is running on port ${PORT}`);
  });
}

export default app;
