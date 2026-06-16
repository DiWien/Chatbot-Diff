import { GoogleGenerativeAI } from '@google/generative-ai';

export async function callGemini({ apiKey, model, systemPrompt, message, context, image, temperature, maxTokens }) {
  if (!apiKey) throw Object.assign(new Error('Missing Gemini API key'), { code: 'AI_AUTH_ERROR' });
  const client = new GoogleGenerativeAI(apiKey);
  const gemini = client.getGenerativeModel({ model, systemInstruction: systemPrompt });
  const prompt = [context ? `Knowledge base context:\n${context}` : '', `User question:\n${message}`].filter(Boolean).join('\n\n');
  const parts = [{ text: prompt }];
  if (image?.base64Data && image?.mimeType) {
    parts.push({ inlineData: { mimeType: image.mimeType, data: image.base64Data } });
  }
  const result = await gemini.generateContent({
    contents: [{ role: 'user', parts }],
    generationConfig: { temperature, maxOutputTokens: maxTokens, topP: 0.9 },
  });
  return {
    text: result.response.text().trim(),
    usage: normalizeGeminiUsage(result.response.usageMetadata),
  };
}

function normalizeGeminiUsage(usage = {}) {
  return {
    inputTokens: Number(usage.promptTokenCount || 0),
    outputTokens: Number(usage.candidatesTokenCount || 0),
    totalTokens: Number(usage.totalTokenCount || 0),
  };
}
