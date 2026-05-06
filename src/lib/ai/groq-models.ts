import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

// ---------------------------------------------------------------------------
// Rate limit tracking & smart model selection
// ---------------------------------------------------------------------------

interface ModelLimit {
  rpm: number;
  rpd: number;
  tpm: number;
  tpd?: number;
}

// Developer plan limits from Groq docs (https://console.groq.com/docs/rate-limits)
const MODEL_LIMITS: Record<string, ModelLimit> = {
  'openai/gpt-oss-120b': { rpm: 30, rpd: 1000, tpm: 8000, tpd: 200000 },
  'meta-llama/llama-4-scout-17b-16e-instruct': { rpm: 30, rpd: 1000, tpm: 30000, tpd: 500000 },
  'llama-3.3-70b-versatile': { rpm: 30, rpd: 1000, tpm: 12000, tpd: 100000 },
  'qwen/qwen3-32b': { rpm: 60, rpd: 1000, tpm: 6000, tpd: 500000 },
  'openai/gpt-oss-20b': { rpm: 30, rpd: 1000, tpm: 8000, tpd: 200000 },
  'groq/compound': { rpm: 30, rpd: 250, tpm: 70000 },
  'llama-3.1-8b-instant': { rpm: 30, rpd: 14400, tpm: 6000, tpd: 500000 },
};

// Priority: most capable first
const MODEL_PRIORITY = [
  'openai/gpt-oss-120b',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'llama-3.3-70b-versatile',
  'qwen/qwen3-32b',
  'openai/gpt-oss-20b',
  'groq/compound',
  'llama-3.1-8b-instant',
];

// Backward compat alias
const MODELS = MODEL_PRIORITY;

interface KeyModelUsage {
  requestTimes: number[]; // timestamps for RPM rolling window (last 60s)
  tokenEstimates: { time: number; tokens: number }[]; // for TPM rolling window
  dailyRequests: number;
  dailyResetAt: number;
  blockedUntil: number;
  lastHeaders?: {
    remainingRequests?: number;
    remainingTokens?: number;
    resetRequestsMs?: number;
    resetTokensMs?: number;
  };
}

class RateLimitTracker {
  private state = new Map<string, KeyModelUsage>();

  private key(keyIndex: number, model: string) {
    return `${keyIndex}::${model}`;
  }

  private getOrCreate(keyIndex: number, model: string): KeyModelUsage {
    const k = this.key(keyIndex, model);
    if (!this.state.has(k)) {
      this.state.set(k, {
        requestTimes: [],
        tokenEstimates: [],
        dailyRequests: 0,
        dailyResetAt: Date.now() + 24 * 60 * 60 * 1000,
        blockedUntil: 0,
      });
    }
    return this.state.get(k)!;
  }

  private prune(usage: KeyModelUsage) {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;
    usage.requestTimes = usage.requestTimes.filter((t) => t > oneMinuteAgo);
    usage.tokenEstimates = usage.tokenEstimates.filter((e) => e.time > oneMinuteAgo);
    if (now > usage.dailyResetAt) {
      usage.dailyRequests = 0;
      usage.dailyResetAt = now + 24 * 60 * 60 * 1000;
    }
  }

  recordRequest(keyIndex: number, model: string, estimatedTokens = 1000) {
    const usage = this.getOrCreate(keyIndex, model);
    this.prune(usage);
    usage.requestTimes.push(Date.now());
    usage.tokenEstimates.push({ time: Date.now(), tokens: estimatedTokens });
    usage.dailyRequests++;
  }

  recordHeaders(
    keyIndex: number,
    model: string,
    headers: {
      remainingRequests?: number;
      remainingTokens?: number;
      resetRequests?: string;
      resetTokens?: string;
      retryAfter?: number;
      status: number;
    }
  ) {
    const usage = this.getOrCreate(keyIndex, model);
    const now = Date.now();

    if (headers.status === 429 && headers.retryAfter) {
      usage.blockedUntil = now + headers.retryAfter * 1000;
      return;
    }

    if (headers.remainingRequests !== undefined && headers.remainingRequests <= 0) {
      usage.blockedUntil = Math.max(
        usage.blockedUntil,
        now + this.parseReset(headers.resetRequests)
      );
    }

    usage.lastHeaders = {
      remainingRequests: headers.remainingRequests,
      remainingTokens: headers.remainingTokens,
      resetRequestsMs: headers.resetRequests
        ? this.parseReset(headers.resetRequests)
        : undefined,
      resetTokensMs: headers.resetTokens
        ? this.parseReset(headers.resetTokens)
        : undefined,
    };
  }

  private parseReset(reset?: string): number {
    if (!reset) return 60_000;
    const minMatch = reset.match(/(\d+)m([\d.]+)s/);
    if (minMatch) {
      return (parseInt(minMatch[1], 10) * 60 + parseFloat(minMatch[2])) * 1000;
    }
    const secMatch = reset.match(/([\d.]+)s/);
    if (secMatch) {
      return parseFloat(secMatch[1]) * 1000;
    }
    const num = parseFloat(reset);
    if (!isNaN(num)) return num * 1000;
    return 60_000;
  }

  isAvailable(keyIndex: number, model: string): boolean {
    const usage = this.getOrCreate(keyIndex, model);
    this.prune(usage);
    const now = Date.now();

    if (usage.blockedUntil > now) return false;

    const limits = MODEL_LIMITS[model];
    if (!limits) return true;

    if (usage.requestTimes.length >= limits.rpm) return false;
    if (usage.dailyRequests >= limits.rpd) return false;

    const tokensLastMin = usage.tokenEstimates.reduce((s, e) => s + e.tokens, 0);
    if (tokensLastMin >= limits.tpm) return false;

    if (limits.tpd && usage.dailyRequests * 2000 >= limits.tpd) {
      return false;
    }

    return true;
  }

  getNextAvailableTime(keyIndex: number, model: string): number {
    const usage = this.getOrCreate(keyIndex, model);
    return Math.max(usage.blockedUntil, usage.dailyResetAt);
  }

  getDebugStatus(): string {
    const now = Date.now();
    const lines: string[] = [];
    this.state.forEach((usage, k) => {
      this.prune(usage);
      const blocked = usage.blockedUntil > now
        ? `blocked ${Math.ceil((usage.blockedUntil - now) / 1000)}s`
        : 'ok';
      lines.push(`${k}: RPM=${usage.requestTimes.length} RPD=${usage.dailyRequests} ${blocked}`);
    });
    return lines.join(' | ') || 'no usage yet';
  }
}

const tracker = new RateLimitTracker();

// ---------------------------------------------------------------------------
// Multi-key pool: env keys + user-donated keys
// ---------------------------------------------------------------------------

interface KeyEntry {
  client: ReturnType<typeof createGroq>;
  keyIndex: number;
  source: 'env' | 'donated';
  id?: string;
}

function getEnvKeys(): string[] {
  const raw = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '';
  return raw
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
}

async function getDonatedKeys(): Promise<{ id: string; key: string }[]> {
  try {
    const rows = await prisma.donatedKey.findMany({
      where: { provider: 'groq', isActive: true },
      select: { id: true, keyCipher: true },
      orderBy: { useCount: 'asc' },
    });
    return rows.map((r) => ({ id: r.id, key: decrypt(r.keyCipher) }));
  } catch (err) {
    console.warn('[Groq] Failed to load donated keys:', err);
    return [];
  }
}

function maybeParseInt(v: string | null): number | undefined {
  if (!v) return undefined;
  const n = parseInt(v, 10);
  return isNaN(n) ? undefined : n;
}

function createTrackedFetch(keyIndex: number): typeof fetch {
  return async (input, init) => {
    let model = 'unknown';
    try {
      if (typeof init?.body === 'string') {
        const body = JSON.parse(init.body);
        model = body.model || 'unknown';
      }
    } catch {
      // ignore parse errors
    }

    const res = await fetch(input, init);

    const url = typeof input === 'string' ? input : 'url' in input ? input.url : input.href;
    if (url.includes('groq.com') || url.includes('groqcloud')) {
      tracker.recordHeaders(keyIndex, model, {
        remainingRequests: maybeParseInt(res.headers.get('x-ratelimit-remaining-requests')),
        remainingTokens: maybeParseInt(res.headers.get('x-ratelimit-remaining-tokens')),
        resetRequests: res.headers.get('x-ratelimit-reset-requests') ?? undefined,
        resetTokens: res.headers.get('x-ratelimit-reset-tokens') ?? undefined,
        retryAfter: maybeParseInt(res.headers.get('retry-after')),
        status: res.status,
      });
    }

    return res;
  };
}

async function buildKeyPool(): Promise<KeyEntry[]> {
  const envKeys = getEnvKeys();
  const donated = await getDonatedKeys();

  const entries: KeyEntry[] = [];

  envKeys.forEach((key, i) => {
    entries.push({
      client: createGroq({
        apiKey: key,
        fetch: createTrackedFetch(i) as any,
      }),
      keyIndex: i,
      source: 'env',
    });
  });

  donated.forEach((d, i) => {
    entries.push({
      client: createGroq({
        apiKey: d.key,
        fetch: createTrackedFetch(envKeys.length + i) as any,
      }),
      keyIndex: envKeys.length + i,
      source: 'donated',
      id: d.id,
    });
  });

  if (entries.length === 0) {
    throw new Error(
      '[Groq] No API keys found. Set GROQ_API_KEYS (comma-separated) or donate a key via /donate-key.'
    );
  }

  console.log(
    `[Groq] Key pool loaded: ${envKeys.length} env keys + ${donated.length} donated keys = ${entries.length} total`
  );
  return entries;
}

// Lazy-loaded pool
let _poolPromise: Promise<KeyEntry[]> | null = null;
let _pool: KeyEntry[] | null = null;

async function getPool(): Promise<KeyEntry[]> {
  if (_pool) return _pool;
  if (!_poolPromise) {
    _poolPromise = buildKeyPool().then((pool) => {
      _pool = pool;
      return pool;
    });
  }
  return _poolPromise;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

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

async function incrementKeyUsage(keyId: string) {
  try {
    await prisma.donatedKey.update({
      where: { id: keyId },
      data: { useCount: { increment: 1 }, lastUsedAt: new Date() },
    });
  } catch {
    // silent fail
  }
}

// ---------------------------------------------------------------------------
// Core smart generation: tries the best model on the best available key.
// Falls back to dumber models / other keys intelligently.
// ---------------------------------------------------------------------------

async function generateSmart(prompt: string): Promise<string> {
  const pool = await getPool();

  // Build attempts: for each model (best first), try every key
  const attempts: { keyEntry: KeyEntry; model: string }[] = [];
  for (const model of MODEL_PRIORITY) {
    for (const keyEntry of pool) {
      attempts.push({ keyEntry, model });
    }
  }

  let lastError: any = null;
  let triedCount = 0;

  for (const { keyEntry, model } of attempts) {
    if (!tracker.isAvailable(keyEntry.keyIndex, model)) {
      continue;
    }
    triedCount++;

    try {
      tracker.recordRequest(keyEntry.keyIndex, model, prompt.length / 2);
      const { text } = await generateText({
        model: keyEntry.client(model),
        prompt,
      });

      if (keyEntry.source === 'donated' && keyEntry.id) {
        incrementKeyUsage(keyEntry.id);
      }

      console.log(
        `[Groq] Success on ${keyEntry.source} key #${keyEntry.keyIndex + 1} + ${model} after ${triedCount} attempt(s). Status: ${tracker.getDebugStatus()}`
      );
      return stripLLMWrappers(text);
    } catch (error: any) {
      lastError = error;

      if (isRateLimitError(error)) {
        const retryAfter = getRetryAfter(error);
        tracker.recordHeaders(keyEntry.keyIndex, model, {
          status: 429,
          retryAfter,
        });
        console.warn(
          `[Groq] Rate limited on ${keyEntry.source} key #${keyEntry.keyIndex + 1} + ${model}. Blocked ${retryAfter}s.`
        );
        continue;
      }

      console.warn(
        `[Groq] Error on ${keyEntry.source} key #${keyEntry.keyIndex + 1} + ${model}: ${error?.message?.slice(0, 120)}`
      );
      continue;
    }
  }

  // All combos exhausted. Find earliest unblock time and wait (capped at 120s).
  let earliestUnblock = Infinity;
  for (const { keyEntry, model } of attempts) {
    const t = tracker.getNextAvailableTime(keyEntry.keyIndex, model);
    if (t < earliestUnblock) earliestUnblock = t;
  }

  const waitMs = Math.max(0, earliestUnblock - Date.now());
  const waitSec = Math.min(Math.ceil(waitMs / 1000), 120);

  if (waitSec > 0) {
    console.warn(`[Groq] All ${triedCount} attempts exhausted. Waiting ${waitSec}s for earliest unblock... Tracker: ${tracker.getDebugStatus()}`);
    await sleep(waitSec * 1000);
  }

  // Final attempt on whatever is now available
  for (const { keyEntry, model } of attempts) {
    if (!tracker.isAvailable(keyEntry.keyIndex, model)) continue;
    try {
      const { text } = await generateText({
        model: keyEntry.client(model),
        prompt,
      });
      return stripLLMWrappers(text);
    } catch (e: any) {
      throw lastError || e;
    }
  }

  throw lastError || new Error('[Groq] All keys and models exhausted.');
}

export async function groqGenerateText(prompt: string): Promise<string> {
  return generateSmart(prompt);
}

export async function groqGenerateObject<T extends z.ZodType>(
  schema: T,
  prompt: string,
  fallback?: z.infer<T>
): Promise<z.infer<T>> {
  const jsonPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON. Do not wrap in markdown code blocks. Do not add any explanatory text before or after the JSON.`;

  let lastRaw: string | null = null;

  try {
    const text = await generateSmart(jsonPrompt);
    lastRaw = text.slice(0, 500);
    const raw = extractJSON(text);
    const parsed = schema.parse(raw);
    return parsed as z.infer<T>;
  } catch (error: any) {
    if (fallback !== undefined) {
      console.error(
        `[Groq] JSON/Zod failed. Using fallback. Error: ${error?.message?.slice(0, 200)} | raw: ${lastRaw?.slice(0, 300)}`
      );
      return fallback;
    }
    throw error;
  }
}

export async function groqGenerateStructured<T extends z.ZodType>(
  schema: T,
  prompt: string,
  fallback?: z.infer<T>
): Promise<{ result: z.infer<T>; usedFallback: boolean }> {
  const pool = await getPool();
  const jsonPrompt = `${prompt}\n\nIMPORTANT: Return ONLY a valid JSON object matching the required schema. Do not wrap in markdown code blocks. Do not add any explanatory text before or after the JSON.`;

  const attempts: { keyEntry: KeyEntry; model: string }[] = [];
  for (const model of MODEL_PRIORITY) {
    for (const keyEntry of pool) {
      attempts.push({ keyEntry, model });
    }
  }

  let lastError: any = null;
  let triedCount = 0;

  for (const { keyEntry, model } of attempts) {
    if (!tracker.isAvailable(keyEntry.keyIndex, model)) continue;
    triedCount++;

    try {
      tracker.recordRequest(keyEntry.keyIndex, model, prompt.length / 2);

      const { text } = await generateText({
        model: keyEntry.client(model),
        prompt: jsonPrompt,
        providerOptions: {
          groq: {
            responseFormat: { type: 'json_object' },
          },
        },
      });

      if (keyEntry.source === 'donated' && keyEntry.id) {
        incrementKeyUsage(keyEntry.id);
      }

      const raw = extractJSON(text);
      const parsed = schema.parse(raw);

      console.log(
        `[Groq] Structured output success on ${keyEntry.source} key #${keyEntry.keyIndex + 1} + ${model} after ${triedCount} attempt(s)`
      );

      return { result: parsed as z.infer<T>, usedFallback: false };
    } catch (error: any) {
      lastError = error;

      if (isRateLimitError(error)) {
        const retryAfter = getRetryAfter(error);
        tracker.recordHeaders(keyEntry.keyIndex, model, {
          status: 429,
          retryAfter,
        });
        console.warn(
          `[Groq] Rate limited on ${keyEntry.source} key #${keyEntry.keyIndex + 1} + ${model}. Blocked ${retryAfter}s.`
        );
        continue;
      }

      console.warn(
        `[Groq] Structured gen error on ${keyEntry.source} key #${keyEntry.keyIndex + 1} + ${model}: ${error?.message?.slice(0, 120)}`
      );
      continue;
    }
  }

  // All combos exhausted. Find earliest unblock time and wait (capped at 120s)
  let earliestUnblock = Infinity;
  for (const { keyEntry, model } of attempts) {
    const t = tracker.getNextAvailableTime(keyEntry.keyIndex, model);
    if (t < earliestUnblock) earliestUnblock = t;
  }

  const waitMs = Math.max(0, earliestUnblock - Date.now());
  const waitSec = Math.min(Math.ceil(waitMs / 1000), 120);

  if (waitSec > 0) {
    console.warn(`[Groq] All ${triedCount} structured gen attempts exhausted. Waiting ${waitSec}s...`);
    await sleep(waitSec * 1000);
  }

  // Final attempt on whatever is now available
  for (const { keyEntry, model } of attempts) {
    if (!tracker.isAvailable(keyEntry.keyIndex, model)) continue;
    try {
      const { text } = await generateText({
        model: keyEntry.client(model),
        prompt: jsonPrompt,
        providerOptions: {
          groq: {
            responseFormat: { type: 'json_object' },
          },
        },
      });
      const raw = extractJSON(text);
      const parsed = schema.parse(raw);
      return { result: parsed as z.infer<T>, usedFallback: false };
    } catch (e: any) {
      lastError = e;
      break;
    }
  }

  // Everything failed — use fallback if provided
  if (fallback !== undefined) {
    console.error(
      `[Groq] All structured gen attempts failed. Using fallback. Last error: ${lastError?.message?.slice(0, 200)}`
    );
    return { result: fallback, usedFallback: true };
  }

  throw lastError || new Error('[Groq] All keys and models exhausted for structured generation.');
}

// Debug export for observability
export function getGroqTrackerStatus(): string {
  return tracker.getDebugStatus();
}

export { MODELS };
