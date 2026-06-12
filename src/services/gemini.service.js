import { GoogleGenerativeAI } from '@google/generative-ai';

export async function callGemini({ apiKey, model, systemPrompt, message, context, temperature, maxTokens }) {
  if (!apiKey) throw Object.assign(new Error('Missing Gemini API key'), { code: 'AI_AUTH_ERROR' });
  const client = new GoogleGenerativeAI(apiKey);
  const gemini = client.getGenerativeModel({ model, systemInstruction: systemPrompt });
  const prompt = [context ? `Knowledge base context:\n${context}` : '', `User question:\n${message}`].filter(Boolean).join('\n\n');
  const result = await gemini.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature, maxOutputTokens: maxTokens, topP: 0.9 },
  });
  return result.response.text().trim();
}
