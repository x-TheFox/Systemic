import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { z } from 'zod';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

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
  // Aggressively remove reasoning/wrapper tag blocks that models like Qwen, DeepSeek emit.
  // These can appear ANYWHERE in the output — even inside JSON string values.
  const wrapperTags = [
    'think', 'thinking', 'thought', 'reasoning', 'output', 'analysis',
    'preliminary_analysis', 'reflection', 'eval',
  ];

  for (const tag of wrapperTags) {
    // Remove properly closed blocks: <tag>...</tag>
    const closed = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    text = text.replace(closed, '');
    // Remove self-closing: <tag/>
    const selfClosing = new RegExp(`<${tag}\\b[^>]*/>`, 'gi');
    text = text.replace(selfClosing, '');
  }

  // If an opening tag is left unclosed (model stopped mid-reasoning), strip everything from it onward.
  // This prevents trailing garbage from poisoning JSON.
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

  // Try to find JSON in markdown code blocks first
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    try {
      parsed = JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // fallback to raw text
    }
  }

  // Try to find the first JSON object or array in the raw text
  if (!parsed) {
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        parsed = JSON.parse(objectMatch[0]);
      } catch {
        // try array
      }
    }
  }

  if (!parsed) {
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        parsed = JSON.parse(arrayMatch[0]);
      } catch {
        // last resort
      }
    }
  }

  // Last resort: try the whole text
  if (!parsed) {
    parsed = JSON.parse(text.trim());
  }

  // Deep-clean any reasoning tags that leaked into JSON string values
  return recursivelyCleanObject(parsed);
}

export async function groqGenerateText(prompt: string): Promise<string> {
  let lastError: any;
  for (let attempt = 0; attempt < MODELS.length; attempt++) {
    const model = attempt === 0 ? currentModel() : nextModel();
    try {
      const { text } = await generateText({
        model: groq(model),
        prompt,
      });
      return stripLLMWrappers(text);
    } catch (error: any) {
      lastError = error;
      if (isRateLimitError(error)) {
        console.warn(`[Groq] Rate limited on ${model}, switching to next model...`);
        continue;
      }
      console.warn(`[Groq] Error on ${model}: ${error?.message?.slice(0, 100)}`);
      continue;
    }
  }

  // All models exhausted — last resort: wait for the last model's retry-after then try once more
  const lastModel = currentModel();
  const waitSeconds = Math.min(getRetryAfter(lastError), 120);
  console.warn(`[Groq] All models hit rate limits. Waiting ${waitSeconds}s for ${lastModel}...`);
  await sleep(waitSeconds * 1000);

  try {
    const { text } = await generateText({
      model: groq(lastModel),
      prompt,
    });
    return stripLLMWrappers(text);
  } catch (error: any) {
    throw lastError;
  }
}

export async function groqGenerateObject<T extends z.ZodType>(
  schema: T,
  prompt: string,
  fallback?: z.infer<T>
): Promise<z.infer<T>> {
  // Append JSON formatting instruction to the prompt
  const jsonPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON. Do not wrap in markdown code blocks. Do not add any explanatory text before or after the JSON.`;

  let lastError: any;
  let lastRaw: string | null = null;

  for (let attempt = 0; attempt < MODELS.length; attempt++) {
    const model = attempt === 0 ? currentModel() : nextModel();
    try {
      const text = await groqGenerateText(jsonPrompt);
      lastRaw = text.slice(0, 500);
      const raw = extractJSON(text);
      const parsed = schema.parse(raw);
      return parsed as z.infer<T>;
    } catch (error: any) {
      lastError = error;
      if (isRateLimitError(error)) {
        console.warn(`[Groq] Rate limited on ${model}, switching to next model...`);
        continue;
      }
      // JSON parse or Zod validation error — log and retry with next model
      console.warn(`[Groq] JSON parse/Zod error on ${model}: ${error?.message?.slice(0, 120)} | raw: ${lastRaw?.slice(0, 200)}`);
      continue;
    }
  }

  // All models exhausted — try one final time after waiting
  const lastModel = currentModel();
  const waitSeconds = Math.min(getRetryAfter(lastError), 120);
  console.warn(`[Groq] All models exhausted. Waiting ${waitSeconds}s for ${lastModel}...`);
  await sleep(waitSeconds * 1000);

  try {
    const text = await groqGenerateText(jsonPrompt);
    const raw = extractJSON(text);
    const parsed = schema.parse(raw);
    return parsed as z.infer<T>;
  } catch (error: any) {
    // If a fallback was provided, return it instead of crashing
    if (fallback !== undefined) {
      console.error(`[Groq] All models failed. Using fallback. Last error: ${lastError?.message?.slice(0, 200)} | raw: ${lastRaw?.slice(0, 300)}`);
      return fallback;
    }
    throw lastError;
  }
}

export { groq, MODELS, currentModel, nextModel };
