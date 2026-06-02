// Shared AI/LLM helpers for the recommendation engine.
// Provider order: xAI Grok -> Groq -> Gemini -> Hugging Face. OpenRouter is intentionally not used.

type LLMMessage = { role: string; content: string };

const XAI_API_KEY = process.env.XAI_API_KEY ?? process.env.GROK_API_KEY ?? '';
const XAI_MODEL = process.env.XAI_MODEL ?? process.env.GROK_MODEL ?? 'grok-3-mini';
const XAI_BASE = process.env.XAI_BASE_URL ?? 'https://api.x.ai/v1';
const XAI_FALLBACK_MODELS = uniqueModels([
  XAI_MODEL,
  'grok-3-mini',
  'grok-3-mini-fast',
  'grok-4.3',
]);

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? '';
const GROQ_MODEL = process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant';
const GROQ_BASE = 'https://api.groq.com/openai/v1';
const GROQ_FALLBACK_MODELS = uniqueModels([
  GROQ_MODEL,
  'llama-3.1-8b-instant',
  'llama3-8b-8192',
  'llama-3.3-70b-versatile',
  'openai/gpt-oss-20b',
]);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? '';
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
const GEMINI_FALLBACK_MODELS = uniqueModels([
  GEMINI_MODEL,
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
]);

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY ?? '';
const HF_BASE = 'https://api-inference.huggingface.co/models';
const HF_CHAT_MODEL = process.env.HF_CHAT_MODEL ?? 'HuggingFaceH4/zephyr-7b-beta';
const EMBED_MODEL = `${HF_BASE}/sentence-transformers/all-MiniLM-L6-v2`;

const MAX_OUTPUT_TOKENS = Number(process.env.LLM_MAX_TOKENS ?? 900);

export async function callDeepSeek(
  promptOrMessages: string | LLMMessage[],
  opts: { max_tokens?: number; temperature?: number } = {}
): Promise<string> {
  const messages = typeof promptOrMessages === 'string'
    ? [{ role: 'user', content: promptOrMessages }]
    : promptOrMessages;

  if (!messages.length || !messages.some((message) => message.content?.trim())) {
    throw new Error('callDeepSeek called with empty prompt');
  }

  return callLLM(messages, opts);
}

export function hasLLMProvider() {
  return Boolean(XAI_API_KEY || GROQ_API_KEY || GEMINI_API_KEY || HF_API_KEY);
}

export async function callLLM(
  messages: LLMMessage[],
  opts: { max_tokens?: number; temperature?: number } = {}
): Promise<string> {
  const providers = [
    XAI_API_KEY ? { name: 'xAI Grok', call: () => callXAI(messages, opts) } : null,
    GROQ_API_KEY ? { name: 'Groq', call: () => callGroq(messages, opts) } : null,
    GEMINI_API_KEY ? { name: 'Gemini', call: () => callGemini(messages, opts) } : null,
    HF_API_KEY ? { name: 'Hugging Face', call: () => callHuggingFace(messages, opts) } : null,
  ].filter(Boolean) as Array<{ name: string; call: () => Promise<string> }>;

  if (!providers.length) {
    throw new Error('No LLM provider configured. Set XAI_API_KEY/GROK_API_KEY, GROQ_API_KEY, GEMINI_API_KEY, or HUGGINGFACE_API_KEY.');
  }

  const errors: string[] = [];
  for (const provider of providers) {
    try {
      const text = cleanModelText(await provider.call());
      if (text) return text;
    } catch (error) {
      errors.push(`${provider.name}: ${error instanceof Error ? error.message : 'unknown provider error'}`);
    }
  }

  throw new Error(`All LLM providers failed: ${errors.join(' | ')}`);
}

async function callXAI(
  messages: LLMMessage[],
  opts: { max_tokens?: number; temperature?: number }
) {
  const errors: string[] = [];

  for (const model of XAI_FALLBACK_MODELS) {
    try {
      const response = await fetch(`${XAI_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${XAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens(opts.max_tokens),
          temperature: opts.temperature ?? 0.2,
          stream: false,
        }),
      });

      if (!response.ok) {
        errors.push(`xAI ${model} ${response.status}: ${(await response.text()).slice(0, 180)}`);
        continue;
      }

      const data = await response.json();
      const text = String(data.choices?.[0]?.message?.content ?? '');
      if (text.trim()) return text;
      errors.push(`xAI ${model}: empty response`);
    } catch (error) {
      errors.push(`xAI ${model}: ${error instanceof Error ? error.message : 'fetch failed'}`);
    }
  }

  throw new Error(errors.join(' | '));
}

async function callGroq(
  messages: LLMMessage[],
  opts: { max_tokens?: number; temperature?: number }
) {
  const errors: string[] = [];

  for (const model of GROQ_FALLBACK_MODELS) {
    try {
      const response = await fetch(`${GROQ_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens(opts.max_tokens),
          temperature: opts.temperature ?? 0.2,
        }),
      });

      if (!response.ok) {
        errors.push(`Groq ${model} ${response.status}: ${(await response.text()).slice(0, 180)}`);
        continue;
      }

      const data = await response.json();
      const text = String(data.choices?.[0]?.message?.content ?? '');
      if (text.trim()) return text;
      errors.push(`Groq ${model}: empty response`);
    } catch (error) {
      errors.push(`Groq ${model}: ${error instanceof Error ? error.message : 'fetch failed'}`);
    }
  }

  throw new Error(errors.join(' | '));
}

async function callGemini(
  messages: LLMMessage[],
  opts: { max_tokens?: number; temperature?: number }
) {
  const system = messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .join('\n\n');
  const conversation = messages.filter((message) => message.role !== 'system');
  const contents = conversation.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }],
  }));

  const body = JSON.stringify({
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    contents: contents.length ? contents : [{ role: 'user', parts: [{ text: system || 'Respond.' }] }],
    generationConfig: {
      maxOutputTokens: maxTokens(opts.max_tokens),
      temperature: opts.temperature ?? 0.2,
    },
  });
  const errors: string[] = [];

  for (const model of GEMINI_FALLBACK_MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        }
      );

      if (!response.ok) {
        errors.push(`Gemini ${model} ${response.status}: ${(await response.text()).slice(0, 180)}`);
        continue;
      }

      const data = await response.json();
      const text = String(
        data.candidates?.[0]?.content?.parts
          ?.map((part: { text?: string }) => part.text ?? '')
          .join('') ?? ''
      );
      if (text.trim()) return text;
      errors.push(`Gemini ${model}: empty response`);
    } catch (error) {
      errors.push(`Gemini ${model}: ${error instanceof Error ? error.message : 'fetch failed'}`);
    }
  }

  throw new Error(errors.join(' | '));
}

async function callHuggingFace(
  messages: LLMMessage[],
  opts: { max_tokens?: number; temperature?: number }
) {
  const response = await fetch(`${HF_BASE}/${HF_CHAT_MODEL}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${HF_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inputs: messagesToPrompt(messages),
      parameters: {
        max_new_tokens: maxTokens(opts.max_tokens),
        temperature: opts.temperature ?? 0.2,
        return_full_text: false,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Hugging Face API error ${response.status}: ${(await response.text()).slice(0, 220)}`);
  }

  const data = await response.json();
  if (Array.isArray(data)) return String(data[0]?.generated_text ?? '');
  return String(data.generated_text ?? '');
}

function maxTokens(requested?: number) {
  return Math.max(32, Math.min(requested ?? 300, MAX_OUTPUT_TOKENS));
}

function messagesToPrompt(messages: LLMMessage[]) {
  return `${messages
    .map((message) => {
      const role = message.role === 'assistant' ? 'Assistant' : message.role === 'system' ? 'System' : 'User';
      return `${role}: ${message.content}`;
    })
    .join('\n\n')}\n\nAssistant:`;
}

function cleanModelText(text: string) {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

function uniqueModels(models: string[]) {
  return [...new Set(models.map((model) => model.trim()).filter(Boolean))];
}

export function parseJSON<T>(raw: string): T | null {
  try {
    let cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end >= 0) cleaned = cleaned.substring(start, end + 1);
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

export async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    if (!HF_API_KEY) return null;
    const response = await fetch(EMBED_MODEL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${HF_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: text }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return Array.isArray(data[0]) ? (data[0] as number[]) : (data as number[]);
  } catch {
    return null;
  }
}
