import { createGroq } from '@ai-sdk/groq';
import { generateText, generateObject } from 'ai';
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
  let lastError: any;
  for (let attempt = 0; attempt < MODELS.length; attempt++) {
    const model = attempt === 0 ? currentModel() : nextModel();
    try {
      const { object } = await generateObject({
        model: groq(model),
        schema,
        prompt,
      });
      return object as z.infer<T>;
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

  // All models exhausted
  const lastModel = currentModel();
  const waitSeconds = Math.min(getRetryAfter(lastError), 120);
  console.warn(`[Groq] All models hit rate limits. Waiting ${waitSeconds}s for ${lastModel}...`);
  await sleep(waitSeconds * 1000);

  try {
    const { object } = await generateObject({
      model: groq(lastModel),
      schema,
      prompt,
    });
    return object as z.infer<T>;
  } catch (error: any) {
    throw lastError;
  }
}

export { groq, MODELS, currentModel, nextModel };