import { groqGenerateObject, groqGenerateText } from './groq-models';
import { z } from 'zod';

export async function evaluatePRComplexity(diff: string, description: string) {
  const truncatedDiff = diff.slice(0, 4000);

  const schema = z.object({
    xp: z.number().describe('XP points between 10 and 100 based on complexity using Systemics scale'),
    category: z.enum(['Frontend', 'Backend', 'DevOps', 'Architecture', 'Algo']),
    justification: z.string()
  });

  return groqGenerateObject(schema, `Analyze the following PR and score its complexity for a developer skill tracking system.

Description: ${description}

Diff (truncated): ${truncatedDiff}

Score rules:
- 10-20: Trivial (typos, config changes, simple refactors)
- 21-40: Easy (small feature, bug fix with tests)
- 41-60: Medium (new endpoint, component with state, algorithm)
- 61-80: Hard (complex feature, integration, architecture change)
- 81-100: Epic (major refactor, new system, critical infrastructure)

Also categorize into: Frontend, Backend, DevOps, Architecture, or Algo.`);
}

export async function generateWeeklyPostMortem(activityData: string) {
  return groqGenerateText(`You are 'The Ghost', the AI overseer of a competitive coder gang called Systemics. 
Generate a brutal, funny, and encouraging weekly "State of the Gang" report.

Rules:
- Call out the MVP (highest XP earner)
- Call out the "Lurker" (lowest activity)
- Highlight any major achievements or rank-ups
- Roast gently, motivate aggressively
- Keep it under 400 words
- Use markdown formatting

Weekly Data: ${activityData}`);
}

export async function categorizeActivity(description: string, platform: string) {
  const schema = z.object({
    category: z.enum(['Frontend', 'Backend', 'DevOps', 'Architecture', 'Algo']),
    confidence: z.number().min(0).max(1),
  });

  const result = await groqGenerateObject(schema, `Categorize this ${platform} activity into one skill axis for a developer skill radar.

Activity: ${description}

Categories:
- Frontend: UI, React, CSS, DOM, client-side
- Backend: APIs, databases, servers, business logic
- DevOps: CI/CD, infrastructure, deployment, monitoring
- Architecture: System design, patterns, scalability
- Algo: Algorithms, data structures, problem solving`);

  return result;
}

export async function classifyLeetCodeTags(problemTags: string[]): Promise<Record<string, number>> {
  const schema = z.object({
    frontend: z.number().describe('Count of frontend-related tags'),
    backend: z.number().describe('Count of backend-related tags'),
    devops: z.number().describe('Count of DevOps-related tags'),
    architecture: z.number().describe('Count of architecture-related tags'),
    algo: z.number().describe('Count of algorithm-related tags'),
  });

  const result = await groqGenerateObject(schema, `Classify these LeetCode problem tags into 5 skill categories. Return the count of tags that fit each category.

Tags: ${problemTags.join(', ')}

Rules:
- Frontend: React, DOM, CSS, HTML, Browser, DOM Manipulation
- Backend: API, Database, SQL, Server, REST, GraphQL
- DevOps: CI/CD, Docker, Kubernetes, AWS, Deployment
- Architecture: System Design, Microservices, Scalability, Distributed Systems
- Algo: Dynamic Programming, Graph, Tree, Array, String, Math, Sorting, Greedy`);

  return {
    Frontend: result.frontend,
    Backend: result.backend,
    DevOps: result.devops,
    Architecture: result.architecture,
    Algo: result.algo,
  };
}

interface CommitScore {
  message: string;
  score: number; // 1-10
}

const CommitBatchSchema = z.object({
  scores: z.array(z.object({
    message: z.string(),
    score: z.number().min(1).max(10).describe('1=trivial, 10=groundbreaking'),
  })).describe('One score per commit message, in the same order'),
});

function scoreToXP(score: number): number {
  if (score <= 2) return 5;
  if (score <= 4) return 12;
  if (score <= 6) return 25;
  if (score <= 8) return 45;
  return 70;
}

export async function evaluateCommitBatch(commitMessages: string[]): Promise<{ totalXP: number; scores: CommitScore[] }> {
  if (commitMessages.length === 0) return { totalXP: 0, scores: [] };

  const BATCH_SIZE = 30;
  const scoredCommits: CommitScore[] = [];
  let totalXP = 0;

  // Process ALL commits in batches of 30, every commit gets an actual LLM score
  for (let start = 0; start < commitMessages.length; start += BATCH_SIZE) {
    const batch = commitMessages.slice(start, start + BATCH_SIZE);

    const prompt = `You are a senior engineering manager evaluating commit quality for a developer XP system.

Rate EACH commit message on a scale of 1-10 based on what the commit likely contains:

SCORING RUBRIC:
1-2: Trivial (typos, whitespace, comments, config tweaks, merge conflicts)
3-4: Minor (small refactors, dependency updates, simple style fixes)
5-6: Solid (bug fixes, small features, test additions, minor API changes)
7-8: Significant (new modules, complex bug fixes, performance improvements, auth/security)
9-10: Major (architectural changes, new systems, critical infrastructure, innovative solutions)

COMMITS TO SCORE (return one score per commit, same order):
${batch.map((m, i) => `${start + i + 1}. ${m}`).join('\n')}`;

    const fallback = { scores: batch.map((m) => ({ message: m, score: 5 })) };
    const result = await groqGenerateObject(CommitBatchSchema, prompt, fallback);

    for (let i = 0; i < batch.length; i++) {
      const msg = batch[i];
      const score = result.scores[i]?.score ?? 5;
      const xp = scoreToXP(score);
      totalXP += xp;
      scoredCommits.push({ message: msg, score });
    }
  }

  return { totalXP, scores: scoredCommits };
}