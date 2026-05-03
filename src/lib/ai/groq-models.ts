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

function extractJSON(text: string): any {
  // Try to find JSON in markdown code blocks first
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // fallback to raw text
    }
  }

  // Try to find the first JSON object or array in the raw text
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch {
      // try array
    }
  }

  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {
      // last resort
    }
  }

  // Last resort: try the whole text
  return JSON.parse(text.trim());
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
      return text;
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
    return text;
  } catch (error: any) {
    throw lastError;
  }
}

export async function groqGenerateObject<T extends z.ZodType>(
  schema: T,
  prompt: string
): Promise<z.infer<T>> {
  // Append JSON formatting instruction to the prompt
  const jsonPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON. Do not wrap in markdown code blocks. Do not add any explanatory text before or after the JSON.`;

  let lastError: any;
  for (let attempt = 0; attempt < MODELS.length; attempt++) {
    const model = attempt === 0 ? currentModel() : nextModel();
    try {
      const text = await groqGenerateText(jsonPrompt);
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
      console.warn(`[Groq] JSON parse/Zod error on ${model}: ${error?.message?.slice(0, 120)}`);
      continue;
    }
  }

  // All models exhausted
  const lastModel = currentModel();
  const waitSeconds = Math.min(getRetryAfter(lastError), 120);
  console.warn(`[Groq] All models hit rate limits. Waiting ${waitSeconds}s for ${lastModel}...`);
  await sleep(waitSeconds * 1000);

  try {
    const text = await groqGenerateText(jsonPrompt);
    const raw = extractJSON(text);
    const parsed = schema.parse(raw);
    return parsed as z.infer<T>;
  } catch (error: any) {
    throw lastError;
  }
}

export { groq, MODELS, currentModel, nextModel };
