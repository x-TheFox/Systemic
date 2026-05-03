import { groqGenerateObject } from '@/lib/ai/groq-models';
import { z } from 'zod';
import type { DeepDiveResult } from '@/lib/fetchers/github-deepdive';

export interface GeneratedNode {
  nodeId: string;
  name: string;
  description: string;
  path: string;
  tier: number;
  positionX: number;
  positionY: number;
  requirements: Record<string, number>;
  xpReward: number;
  parentIds: string[];
  unlocked?: boolean;
  justification: string;
}

// ---------------------------------------------------------------------------
// LLM outputs are messy. We accept a VERY loose shape then normalize it.
// ---------------------------------------------------------------------------

const looseRequirementsSchema = z.record(z.any()).default({});

const looseNodeSchema = z.object({
  nodeId: z.string().optional(),
  id: z.string().optional(),
  name: z.string().optional().default('Unnamed Node'),
  description: z.string().optional().default(''),
  path: z.string().optional().default('Core'),
  branch: z.string().optional(),
  tier: z.coerce.number().optional().default(1),
  positionX: z.coerce.number().optional(),
  positionY: z.coerce.number().optional(),
  x: z.coerce.number().optional(),
  y: z.coerce.number().optional(),
  pos: z.object({ x: z.coerce.number(), y: z.coerce.number() }).optional(),
  position: z.object({ x: z.coerce.number(), y: z.coerce.number() }).optional(),
  requirements: looseRequirementsSchema,
  required: looseRequirementsSchema,
  reqs: looseRequirementsSchema,
  xpReward: z.coerce.number().optional(),
  reward_xp: z.coerce.number().optional(),
  xp: z.coerce.number().optional(),
  parentIds: z.array(z.string()).optional(),
  parents: z.array(z.string()).optional(),
  parent: z.string().optional(),
  unlocked: z.boolean().optional().default(false),
  justification: z.string().optional().default(''),
});

const looseNewNodesSchema = z.object({
  newNodes: z.array(looseNodeSchema).optional().default([]),
});

const looseNodesSchema = z.object({
  nodes: z.array(looseNodeSchema).optional().default([]),
});

// Also accept raw arrays at the top level
const looseArraySchema = z.array(looseNodeSchema).optional().default([]);

// ---------------------------------------------------------------------------
// Normalizer: converts whatever the LLM returned into a proper GeneratedNode
// ---------------------------------------------------------------------------

function normalizeRequirements(raw: any): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {};
  const result: Record<string, number> = {};
  for (const [key, val] of Object.entries(raw)) {
    const num = typeof val === 'number' ? val : typeof val === 'string' ? parseInt(val, 10) || 0 : 0;
    if (num > 0) result[key] = num;
  }
  return result;
}

function kebabCase(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeNode(raw: z.infer<typeof looseNodeSchema>, index: number): GeneratedNode {
  const nodeId = raw.nodeId || raw.id || `ai-node-${kebabCase(raw.name ?? 'unknown')}-${index}`;
  const name = raw.name || 'Unnamed Node';
  const description = raw.description || '';
  const path = raw.path || raw.branch || 'Core';
  const tier = Math.max(0, Math.min(10, raw.tier ?? 1));

  // Handle multiple position field variations
  let positionX = 500;
  let positionY = tier * 180;
  if (raw.positionX !== undefined) positionX = raw.positionX;
  else if (raw.x !== undefined) positionX = raw.x;
  else if (raw.pos?.x !== undefined) positionX = raw.pos.x;
  else if (raw.position?.x !== undefined) positionX = raw.position.x;
  else positionX = 200 + (index % 4) * 200; // spread horizontally

  if (raw.positionY !== undefined) positionY = raw.positionY;
  else if (raw.y !== undefined) positionY = raw.y;
  else if (raw.pos?.y !== undefined) positionY = raw.pos.y;
  else if (raw.position?.y !== undefined) positionY = raw.position.y;

  const reqs = raw.requirements || raw.required || raw.reqs || {};
  const requirements = normalizeRequirements(reqs);

  const xpReward = raw.xpReward ?? raw.reward_xp ?? raw.xp ?? 100;

  let parentIds: string[] = [];
  if (Array.isArray(raw.parentIds)) parentIds = raw.parentIds;
  else if (Array.isArray(raw.parents)) parentIds = raw.parents;
  else if (typeof raw.parent === 'string') parentIds = [raw.parent];

  // Auto-assign parent if none given and not root
  if (parentIds.length === 0 && tier > 0) {
    parentIds = ['core-junior-dev'];
  }

  return {
    nodeId,
    name,
    description,
    path,
    tier,
    positionX: Math.round(positionX),
    positionY: Math.round(positionY),
    requirements,
    xpReward: Math.round(xpReward),
    parentIds,
    unlocked: raw.unlocked ?? (tier === 0),
    justification: raw.justification || `AI-generated ${path} node at tier ${tier}`,
  };
}

function extractNodesFromResponse(response: any): GeneratedNode[] {
  if (!response) return [];

  let rawNodes: any[] = [];

  if (Array.isArray(response)) {
    // LLM returned raw array
    rawNodes = response;
  } else if (response.newNodes && Array.isArray(response.newNodes)) {
    rawNodes = response.newNodes;
  } else if (response.nodes && Array.isArray(response.nodes)) {
    rawNodes = response.nodes;
  } else if (typeof response === 'object') {
    // Maybe the LLM wrapped it in an extra object
    const values = Object.values(response);
    if (values.length === 1 && Array.isArray(values[0])) {
      rawNodes = values[0];
    }
  }

  return rawNodes
    .filter((n) => n && typeof n === 'object')
    .map((n, i) => normalizeNode(n, i));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function generatePersonalizedSkillTree(
  userId: string,
  recentActivities: Array<{
    platform: string;
    activityType: string;
    description: string;
    xpAwarded: number;
    metadata?: Record<string, unknown>;
  }>,
  currentNodes: GeneratedNode[],
  userStats: {
    totalXP: number;
    totalCommits: number;
    totalPRs: number;
    leetcodeEasy: number;
    leetcodeMedium: number;
    leetcodeHard: number;
    codeforcesRating: number;
    codeforcesSolved: number;
    dominantSkills: string[];
  }
): Promise<GeneratedNode[]> {
  const existingNodesSummary = currentNodes.map((n) => ({
    nodeId: n.nodeId,
    name: n.name,
    path: n.path,
    tier: n.tier,
    unlocked: n.unlocked,
  }));

  const fallback = { newNodes: [] };

  // We tell the LLM what we want, but use a loose schema for parsing
  const response = await groqGenerateObject(
    looseNewNodesSchema,
    `You are the AI Architect of Systemics, a competitive developer skill tree.

Generate 0-3 NEW skill tree nodes for a specific user based on their activity and stats.

USER STATS:
- Total XP: ${userStats.totalXP}
- Commits: ${userStats.totalCommits}, PRs: ${userStats.totalPRs}
- LeetCode: ${userStats.leetcodeEasy}E / ${userStats.leetcodeMedium}M / ${userStats.leetcodeHard}H
- Codeforces: Rating ${userStats.codeforcesRating}, Solved ${userStats.codeforcesSolved}
- Dominant Skills: ${userStats.dominantSkills.join(', ') || 'None yet'}

RECENT ACTIVITIES (last 20):
${recentActivities.slice(0, 20).map((a) => `- [${a.platform}] ${a.activityType}: ${a.description} (+${a.xpAwarded} XP)`).join('\n')}

EXISTING NODES:
${existingNodesSummary.map((n) => `- ${n.nodeId}: ${n.name} (${n.path}, tier ${n.tier}, ${n.unlocked ? 'unlocked' : 'locked'})`).join('\n')}

RULES:
1. Only generate nodes that feel NATURAL given the user's actual activity
2. Names should be MEMORABLE and slightly exaggerated (e.g., "Kernel Whisperer", "React Artisan")
3. Requirements should be ACHIEVABLE but require real effort (1.5-3x their current stats)
4. DO NOT duplicate existing node concepts
5. Return EMPTY newNodes array if nothing new is warranted
6. Position nodes to not overlap (spread X, increase Y per tier)

RETURN FORMAT — a JSON object with this exact structure:
{
  "newNodes": [
    {
      "nodeId": "unique-kebab-case-id",
      "name": "Short Hype Name",
      "description": "What it represents and how to unlock it",
      "path": "One of: Frontend Wizard, Systems Engineer, Data Scientist, Core, Fullstack Legend, DevOps Architect",
      "tier": 1,
      "positionX": 200,
      "positionY": 200,
      "requirements": { "total_xp": 100, "leetcode_medium": 5 },
      "xpReward": 150,
      "parentIds": ["core-junior-dev"],
      "justification": "Why this node was generated"
    }
  ]
}

Only include requirement keys that are actually needed. Set values to 0 or omit if not required.`,
    fallback
  );

  return extractNodesFromResponse(response);
}

export async function generateInitialTreeFromDeepDive(
  deepDive: DeepDiveResult,
  userStats: {
    totalXP: number;
    totalCommits: number;
    totalPRs: number;
    leetcodeHard: number;
    leetcodeMedium: number;
    leetcodeEasy: number;
    codeforcesRating: number;
    codeforcesSolved: number;
  }
): Promise<GeneratedNode[]> {
  const { repos, skillSignals, dominantPath, languageBreakdown, topicInterests } = deepDive;

  const totalBytes = Object.values(languageBreakdown).reduce((a, b) => a + b, 0);
  const topLanguages = Object.entries(languageBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([lang, bytes]) => `${lang}: ${Math.round((bytes / (totalBytes || 1)) * 100)}%`)
    .join(', ');

  const topRepos = repos
    .sort((a, b) => b.commitCount - a.commitCount)
    .slice(0, 10)
    .map((r) => `- ${r.name} (${r.language || 'unknown'}, ${r.commitCount} commits, ${r.stars} stars): ${(r.description || 'No description').slice(0, 100)}`)
    .join('\n');

  const repoReadmeSnippets = repos
    .filter((r) => r.readmeSnippet.length > 20)
    .slice(0, 5)
    .map((r) => `[${r.name}]: ${r.readmeSnippet.slice(0, 150)}`)
    .join('\n');

  const recentCommits = repos
    .flatMap((r) => r.recentCommitMessages.slice(0, 3).map((m) => `[${r.name}] ${m}`))
    .slice(0, 20)
    .join('\n');

  const skillSummary = Object.entries(skillSignals)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

  const fallbackNodes = await generateInitialSkillTree();

  const response = await groqGenerateObject(
    looseNodesSchema,
    `You are the AI Architect of Systemics, building a PERSONALIZED skill tree for a developer based on their ENTIRE GitHub history.

USER PROFILE:
- Login: ${deepDive.user.login}
- Bio: ${deepDive.user.bio || 'No bio'}
- Public repos: ${deepDive.user.publicRepos}
- Followers: ${deepDive.user.followers}
- Account age: ${new Date().getFullYear() - new Date(deepDive.user.createdAt).getFullYear()} years
- Dominant path: ${dominantPath}
- Estimated total commits: ${deepDive.totalCommitEstimate}

CURRENT STATS:
- Total XP: ${userStats.totalXP}
- Commits: ${userStats.totalCommits}, PRs: ${userStats.totalPRs}
- LeetCode: ${userStats.leetcodeEasy}E / ${userStats.leetcodeMedium}M / ${userStats.leetcodeHard}H
- Codeforces: Rating ${userStats.codeforcesRating}, Solved ${userStats.codeforcesSolved}

SKILL SIGNALS (from deep repo analysis):
${skillSummary}

TOP LANGUAGES:
${topLanguages}

TOPICS OF INTEREST:
${topicInterests.slice(0, 20).join(', ')}

TOP REPOS BY ACTIVITY:
${topRepos}

README SNIPPETS:
${repoReadmeSnippets}

RECENT COMMITS:
${recentCommits}

RULES:
1. Start with ONE root node (tier 0) that should ALWAYS be unlocked — "Code Initiate" or similar
2. Create 2-4 PATH branches at tier 1 that match the user's ACTUAL skills
3. Create deeper nodes (tier 2-3) that represent REAL skills this user clearly has
4. If user has STRONG signals in an area, make those nodes UNLOCKED
5. For weaker signals, make nodes LOCKED with reasonable requirements
6. Names must be MEMORABLE and HYPE (gaming-style). No generic names.
7. Requirements should be ACHIEVABLE — roughly 1.2-2x their current stats
8. Position nodes so paths spread out horizontally (X) and deepen vertically (Y)

RETURN FORMAT — a JSON object with this exact structure:
{
  "nodes": [
    {
      "nodeId": "unique-kebab-id",
      "name": "Hype Name",
      "description": "2-3 sentences",
      "path": "Frontend Wizard",
      "tier": 0,
      "positionX": 500,
      "positionY": 0,
      "requirements": { "total_xp": 0 },
      "xpReward": 0,
      "parentIds": [],
      "unlocked": true,
      "justification": "Why this node"
    }
  ]
}

Only include requirement keys that are actually needed. Set values to 0 or omit if not required.`,
    { nodes: fallbackNodes as any }
  );

  return extractNodesFromResponse(response);
}

export async function generateInitialSkillTree(): Promise<GeneratedNode[]> {
  return [
    {
      nodeId: 'core-junior-dev',
      name: 'Junior Dev',
      description: 'Welcome to the grind. Every legend starts here.',
      path: 'Core',
      tier: 0,
      positionX: 500,
      positionY: 0,
      requirements: { total_xp: 0 },
      xpReward: 0,
      parentIds: [],
      unlocked: true,
      justification: 'Root node for all users',
    },
    {
      nodeId: 'fw-dom-surgeon',
      name: 'DOM Surgeon',
      description: 'Master the art of DOM manipulation and UI craft.',
      path: 'Frontend Wizard',
      tier: 1,
      positionX: 200,
      positionY: 200,
      requirements: { skill_xp_Frontend: 50 },
      xpReward: 100,
      parentIds: ['core-junior-dev'],
      unlocked: false,
      justification: 'Default frontend starter path',
    },
    {
      nodeId: 'se-concurrency-master',
      name: 'Concurrency Master',
      description: 'Tame threads, locks, and race conditions.',
      path: 'Systems Engineer',
      tier: 1,
      positionX: 500,
      positionY: 200,
      requirements: { leetcode_hard: 5 },
      xpReward: 150,
      parentIds: ['core-junior-dev'],
      unlocked: false,
      justification: 'Default systems starter path',
    },
    {
      nodeId: 'ds-sql-sage',
      name: 'SQL Sage',
      description: 'Query the universe. Data is power.',
      path: 'Data Scientist',
      tier: 1,
      positionX: 800,
      positionY: 200,
      requirements: { skill_xp_Algo: 100 },
      xpReward: 120,
      parentIds: ['core-junior-dev'],
      unlocked: false,
      justification: 'Default data starter path',
    },
  ];
}

export async function recommendNextPath(
  activities: Array<{ platform: string; description: string }>
): Promise<string> {
  const fallback = { recommendedPath: 'Fullstack Legend' as const, reasoning: 'Default recommendation' };

  const object = await groqGenerateObject(
    z.object({
      recommendedPath: z.enum(['Frontend Wizard', 'Systems Engineer', 'Data Scientist', 'Fullstack Legend', 'DevOps Architect']),
      reasoning: z.string(),
    }),
    `Based on this developer's recent activity, recommend their optimal grind path.

Activities:
${activities.slice(0, 10).map((a) => `- ${a.platform}: ${a.description}`).join('\n')}

Return the best matching path and a one-sentence reasoning.`,
    fallback
  );

  return object.recommendedPath ?? fallback.recommendedPath;
}
