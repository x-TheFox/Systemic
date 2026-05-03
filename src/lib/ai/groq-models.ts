import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Multi-key pool: parse comma-separated API keys from GROQ_API_KEYS env var.
// Each key gets its own Groq client.  We round-robin across keys AND models
// so rate limits scale linearly with the number of keys.
// ---------------------------------------------------------------------------

function buildKeyPool(): { client: ReturnType<typeof createGroq>; keyIndex: number }[] {
  const raw = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '';
  const keys = raw
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

  if (keys.length === 0) {
    throw new Error(
      '[Groq] No API keys found. Set GROQ_API_KEYS (comma-separated) or GROQ_API_KEY.'
    );
  }

  return keys.map((key, i) => ({
    client: createGroq({ apiKey: key }),
    keyIndex: i,
  }));
}

const KEY_POOL = buildKeyPool();
let keyIndex = 0;

function nextKey() {
  const entry = KEY_POOL[keyIndex % KEY_POOL.length];
  keyIndex = (keyIndex + 1) % KEY_POOL.length;
  return entry;
}

function currentKey() {
  return KEY_POOL[keyIndex % KEY_POOL.length];
}

// Convenience: single groq export for backward-compat (uses current key)
const groq = currentKey().client;

const MODELS = [
  'openai/gpt-oss-120b',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'llama-3.3-70b-versatile',
  'qwen/qwen3-32b',
  'openai/gpt-oss-20b',
  'groq/compound',
  'llama-3.1-8b-instant',
] as const;

let modelIndex = 0;

function nextModel(): string {
  const model = MODELS[modelIndex % MODELS.length];
  modelIndex = (modelIndex + 1) % MODELS.length;
  return model;
}

function currentModel(): string {
  return MODELS[modelIndex % MODELS.length];
}

function isRateLimitError(error: any): boolean {
  return (
    error?.statusCode === 429 ||
    error?.message?.includes('rate_limit') ||
    error?.message?.includes('Rate limit') ||
    error?.message?.includes('TPD') ||
    error?.message?.includes('quota') ||
    error?.message?.includes('limit') ||
    error?.cause?.statusCode === 429
  );
}

function getRetryAfter(error: any): number {
  const retryAfter = error?.responseHeaders?.get?.('retry-after');
  if (retryAfter) return parseInt(retryAfter, 10) || 60;
  const match = error?.message?.match(/try again in (\d+)\s*([sm])/i);
  if (match) {
    const val = parseInt(match[1], 10);
    return match[2] === 'm' ? val * 60 : val;
  }
  return 60;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripLLMWrappers(text: string): string {
  const wrapperTags = [
    'think', 'thinking', 'thought', 'reasoning', 'output', 'analysis',
    'preliminary_analysis', 'reflection', 'eval',
  ];

  for (const tag of wrapperTags) {
    const closed = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    text = text.replace(closed, '');
    const selfClosing = new RegExp(`<${tag}\\b[^>]*/>`, 'gi');
    text = text.replace(selfClosing, '');
  }

  const unclosed = new RegExp(
    `<(?:${wrapperTags.join('|')})\\b[^>]*>[\\s\\S]*$`,
    'i'
  );
  text = text.replace(unclosed, '');

  return text;
}

function recursivelyCleanObject(obj: any): any {
  if (typeof obj === 'string') {
    return stripLLMWrappers(obj).trim();
  }
  if (Array.isArray(obj)) {
    return obj.map(recursivelyCleanObject);
  }
  if (obj && typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      cleaned[key] = recursivelyCleanObject(value);
    }
    return cleaned;
  }
  return obj;
}

function extractJSON(text: string): any {
  text = stripLLMWrappers(text);

  let parsed: any;

  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    try {
      parsed = JSON.parse(codeBlockMatch[1].trim());
    } catch { /* noop */ }
  }

  if (!parsed) {
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        parsed = JSON.parse(objectMatch[0]);
      } catch { /* noop */ }
    }
  }

  if (!parsed) {
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        parsed = JSON.parse(arrayMatch[0]);
      } catch { /* noop */ }
    }
  }

  if (!parsed) {
    parsed = JSON.parse(text.trim());
  }

  return recursivelyCleanObject(parsed);
}

// ---------------------------------------------------------------------------
// Core retry loop: tries every (key × model) combination before giving up.
// With N keys and M models we have N×M attempts.
// ---------------------------------------------------------------------------

async function generateWithRetry(
  prompt: string,
  options?: { maxAttempts?: number }
): Promise<string> {
  const maxAttempts = options?.maxAttempts ?? MODELS.length * KEY_POOL.length;
  let lastError: any;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const model = attempt === 0 ? currentModel() : nextModel();
    const keyEntry = attempt === 0 ? currentKey() : nextKey();

    try {
      const { text } = await generateText({
        model: keyEntry.client(model),
        prompt,
      });
      return stripLLMWrappers(text);
    } catch (error: any) {
      lastError = error;

      if (isRateLimitError(error)) {
        console.warn(
          `[Groq] Rate limited on key #${keyEntry.keyIndex + 1}/${KEY_POOL.length} + model ${model}. Rotating...`
        );
        continue;
      }

      console.warn(
        `[Groq] Error on key #${keyEntry.keyIndex + 1} + ${model}: ${error?.message?.slice(0, 100)}`
      );
      continue;
    }
  }

  // All combos exhausted — wait for the current key's retry-after then try once more
  const lastKey = currentKey();
  const lastModelName = currentModel();
  const waitSeconds = Math.min(getRetryAfter(lastError), 120);

  console.warn(
    `[Groq] All ${KEY_POOL.length} keys × ${MODELS.length} models exhausted. Waiting ${waitSeconds}s for key #${lastKey.keyIndex + 1} + ${lastModelName}...`
  );
  await sleep(waitSeconds * 1000);

  try {
    const { text } = await generateText({
      model: lastKey.client(lastModelName),
      prompt,
    });
    return stripLLMWrappers(text);
  } catch (error: any) {
    throw lastError;
  }
}

export async function groqGenerateText(prompt: string): Promise<string> {
  return generateWithRetry(prompt);
}

export async function groqGenerateObject<T extends z.ZodType>(
  schema: T,
  prompt: string,
  fallback?: z.infer<T>
): Promise<z.infer<T>> {
  const jsonPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON. Do not wrap in markdown code blocks. Do not add any explanatory text before or after the JSON.`;

  let lastError: any;
  let lastRaw: string | null = null;
  const maxAttempts = MODELS.length * KEY_POOL.length;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const model = attempt === 0 ? currentModel() : nextModel();
    const keyEntry = attempt === 0 ? currentKey() : nextKey();

    try {
      const text = await generateWithRetry(jsonPrompt, { maxAttempts: 1 });
      lastRaw = text.slice(0, 500);
      const raw = extractJSON(text);
      const parsed = schema.parse(raw);
      return parsed as z.infer<T>;
    } catch (error: any) {
      lastError = error;

      if (isRateLimitError(error)) {
        console.warn(
          `[Groq] Rate limited on key #${keyEntry.keyIndex + 1} + ${model} (object mode). Rotating...`
        );
        continue;
      }

      console.warn(
        `[Groq] JSON/Zod error on key #${keyEntry.keyIndex + 1} + ${model}: ${error?.message?.slice(0, 120)} | raw: ${lastRaw?.slice(0, 200)}`
      );
      continue;
    }
  }

  // All combos exhausted — final attempt after wait
  const lastKey = currentKey();
  const waitSeconds = Math.min(getRetryAfter(lastError), 120);
  console.warn(
    `[Groq] All ${KEY_POOL.length} keys × ${MODELS.length} models exhausted (object mode). Waiting ${waitSeconds}s for key #${lastKey.keyIndex + 1}...`
  );
  await sleep(waitSeconds * 1000);

  try {
    const text = await generateWithRetry(jsonPrompt, { maxAttempts: 1 });
    const raw = extractJSON(text);
    const parsed = schema.parse(raw);
    return parsed as z.infer<T>;
  } catch (error: any) {
    if (fallback !== undefined) {
      console.error(
        `[Groq] All keys failed. Using fallback. Last error: ${lastError?.message?.slice(0, 200)} | raw: ${lastRaw?.slice(0, 300)}`
      );
      return fallback;
    }
    throw lastError;
  }
}

export { groq, MODELS, currentModel, nextModel, KEY_POOL };
