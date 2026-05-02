import { createGroq } from '@ai-sdk/groq';
import { generateText, generateObject } from 'ai';
import { z, ZodType } from 'zod';

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

export async function groqGenerateText(prompt: string, options?: { maxTokens?: number }): Promise<string> {
  let lastError: any;
  const totalAttempts = MODELS.length + 2;
  for (let attempt = 0; attempt < totalAttempts; attempt++) {
    const model = attempt === 0 ? currentModel() : nextModel();
    try {
      const { text } = await generateText({
        model: groq(model),
        prompt,
        maxTokens: options?.maxTokens,
      });
      return text;
    } catch (error: any) {
      lastError = error;
      if (isRateLimitError(error)) {
        const waitSeconds = Math.min(getRetryAfter(error), 120);
        console.warn(`[Groq] Rate limited on ${model}, waiting ${waitSeconds}s then trying next model...`);
        await sleep(waitSeconds * 1000);
        continue;
      }
      console.warn(`[Groq] Error on ${model}: ${error?.message?.slice(0, 100)}`);
      await sleep(2000);
      continue;
    }
  }
  throw lastError;
}

export async function groqGenerateObject<T extends z.ZodType>(
  schema: T,
  prompt: string,
  options?: { maxTokens?: number }
): Promise<z.infer<T>> {
  let lastError: any;
  const totalAttempts = MODELS.length + 2;
  for (let attempt = 0; attempt < totalAttempts; attempt++) {
    const model = attempt === 0 ? currentModel() : nextModel();
    try {
      const { object } = await generateObject({
        model: groq(model),
        schema,
        prompt,
        maxTokens: options?.maxTokens,
      });
      return object as z.infer<T>;
    } catch (error: any) {
      lastError = error;
      if (isRateLimitError(error)) {
        const waitSeconds = Math.min(getRetryAfter(error), 120);
        console.warn(`[Groq] Rate limited on ${model}, waiting ${waitSeconds}s then trying next model...`);
        await sleep(waitSeconds * 1000);
        continue;
      }
      console.warn(`[Groq] Error on ${model}: ${error?.message?.slice(0, 100)}`);
      await sleep(2000);
      continue;
    }
  }
  throw lastError;
}

export async function groqGenerateObjectWithSchema(
  modelParam: string | undefined,
  schema: z.ZodType,
  prompt: string
): Promise<any> {
  return groqGenerateObject(schema, prompt);
}

export { groq, MODELS, currentModel, nextModel };