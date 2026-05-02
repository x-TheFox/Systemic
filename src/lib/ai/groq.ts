import { generateText, generateObject } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { z } from 'zod';

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function evaluatePRComplexity(diff: string, description: string) {
  const truncatedDiff = diff.slice(0, 4000); // Keep within token limits

  const { object } = await generateObject({
    model: groq('llama3-70b-8192'),
    schema: z.object({
      xp: z.number().describe('XP points between 10 and 100 based on complexity using Systemics scale'),
      category: z.enum(['Frontend', 'Backend', 'DevOps', 'Architecture', 'Algo']),
      justification: z.string()
    }),
    prompt: `Analyze the following PR and score its complexity for a developer skill tracking system.

Description: ${description}

Diff (truncated): ${truncatedDiff}

Score rules:
- 10-20: Trivial (typos, config changes, simple refactors)
- 21-40: Easy (small feature, bug fix with tests)
- 41-60: Medium (new endpoint, component with state, algorithm)
- 61-80: Hard (complex feature, integration, architecture change)
- 81-100: Epic (major refactor, new system, critical infrastructure)

Also categorize into: Frontend, Backend, DevOps, Architecture, or Algo.`,
  });

  return object;
}

export async function generateWeeklyPostMortem(activityData: string) {
  const { text } = await generateText({
    model: groq('llama3-70b-8192'),
    prompt: `You are 'The Ghost', the AI overseer of a competitive coder gang called Systemics. 
Generate a brutal, funny, and encouraging weekly "State of the Gang" report.

Rules:
- Call out the MVP (highest XP earner)
- Call out the "Lurker" (lowest activity)
- Highlight any major achievements or rank-ups
- Roast gently, motivate aggressively
- Keep it under 400 words
- Use markdown formatting

Weekly Data: ${activityData}`,
  });
  return text;
}

export async function categorizeActivity(description: string, platform: string) {
  const { object } = await generateObject({
    model: groq('llama3-70b-8192'),
    schema: z.object({
      category: z.enum(['Frontend', 'Backend', 'DevOps', 'Architecture', 'Algo']),
      confidence: z.number().min(0).max(1),
    }),
    prompt: `Categorize this ${platform} activity into one skill axis for a developer skill radar.

Activity: ${description}

Categories:
- Frontend: UI, React, CSS, DOM, client-side
- Backend: APIs, databases, servers, business logic
- DevOps: CI/CD, infrastructure, deployment, monitoring
- Architecture: System design, patterns, scalability
- Algo: Algorithms, data structures, problem solving`,
  });

  return object;
}

export async function classifyLeetCodeTags(problemTags: string[]): Promise<Record<string, number>> {
  const { object } = await generateObject({
    model: groq('llama3-70b-8192'),
    schema: z.object({
      frontend: z.number().describe('Count of frontend-related tags'),
      backend: z.number().describe('Count of backend-related tags'),
      devops: z.number().describe('Count of DevOps-related tags'),
      architecture: z.number().describe('Count of architecture-related tags'),
      algo: z.number().describe('Count of algorithm-related tags'),
    }),
    prompt: `Classify these LeetCode problem tags into 5 skill categories. Return the count of tags that fit each category.

Tags: ${problemTags.join(', ')}

Rules:
- Frontend: React, DOM, CSS, HTML, Browser, DOM Manipulation
- Backend: API, Database, SQL, Server, REST, GraphQL
- DevOps: CI/CD, Docker, Kubernetes, AWS, Deployment
- Architecture: System Design, Microservices, Scalability, Distributed Systems
- Algo: Dynamic Programming, Graph, Tree, Array, String, Math, Sorting, Greedy`,
  });

  return {
    Frontend: object.frontend,
    Backend: object.backend,
    DevOps: object.devops,
    Architecture: object.architecture,
    Algo: object.algo,
  };
}
