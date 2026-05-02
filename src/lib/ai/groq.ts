import { generateText, generateObject } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { z } from 'zod';

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function evaluatePRComplexity(diff: string, description: string) {
  const { object } = await generateObject({
    model: groq('llama3-70b-8192'),
    schema: z.object({
      xp: z.number().describe('XP points between 10 and 100 based on complexity using Systemics scale'),
      category: z.enum(['Frontend', 'Backend', 'DevOps', 'Architecture', 'Algo']),
      justification: z.string()
    }),
    prompt: `Analyze the following PR and score its complexity.\n\nDescription: ${description}\n\nDiff: ${diff}`,
  });

  return object;
}

export async function generateWeeklyPostMortem(activityData: string) {
  const { text } = await generateText({
    model: groq('llama3-70b-8192'),
    prompt: `You are 'The Ghost', the AI overseer of a competitive coder gang. Generate a brutal and encouraging weekly state-of-the-gang report.\n\nData: ${activityData}`,
  });
  return text;
}
