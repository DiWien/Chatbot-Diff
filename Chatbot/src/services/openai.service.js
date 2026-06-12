import OpenAI from 'openai';

export async function callOpenAI({ apiKey, model, systemPrompt, message, context, temperature, maxTokens }) {
  if (!apiKey) throw Object.assign(new Error('Missing OpenAI API key'), { code: 'AI_AUTH_ERROR' });
  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model,
    temperature,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: [context ? `Knowledge base context:\n${context}` : '', `User question:\n${message}`].filter(Boolean).join('\n\n') },
    ],
  });
  return completion.choices?.[0]?.message?.content?.trim() || '';
}
