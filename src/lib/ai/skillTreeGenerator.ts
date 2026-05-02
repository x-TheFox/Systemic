import { generateObject } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { z } from 'zod';

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface GeneratedNode {
  nodeId: string;
  name: string;
  description: string;
  path: string;
  tier: number;
  positionX: number;
  positionY: number;
  requirements: Record<string, unknown>;
  xpReward: number;
  parentIds: string[];
  justification: string;
}

/**
 * Generates a personalized skill tree for a user based on their activity.
 * Call this after every sync to potentially grow the tree.
 */
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

  const { object } = await generateObject({
    model: groq('llama3-70b-8192'),
    schema: z.object({
      newNodes: z.array(
        z.object({
          nodeId: z.string().describe('Unique kebab-case ID for the node. Use prefix like fw-, se-, ds-, core-'),
          name: z.string().describe('Short, hype name for the skill/node'),
          description: z.string().describe('What the node represents and how to unlock it'),
          path: z.string().describe('One of: Frontend Wizard, Systems Engineer, Data Scientist, Core, or a new custom path based on user activity'),
          tier: z.number().int().min(1).max(10).describe('Depth in the tree. Root = 0, children = parent.tier + 1'),
          positionX: z.number().int().describe('X coordinate on the canvas. Range 0-1000'),
          positionY: z.number().int().describe('Y coordinate on the canvas. Range 0-1000. Increase Y for deeper tiers'),
          requirements: z.object({}).passthrough().describe("Unlock requirements object. Keys like 'total_xp', 'leetcode_hard', 'github_prs', 'skill_xp_Backend', etc."),
          xpReward: z.number().int().min(50).max(2000).describe('XP awarded when unlocked'),
          parentIds: z.array(z.string()).describe('IDs of parent nodes that must be unlocked first'),
          justification: z.string().describe('Why this node was generated for this user'),
        })
      ).max(3).describe('0-3 new nodes to add to the tree. Empty if nothing new to generate.'),
    }),
    prompt: `You are the AI Architect of Systemics, a competitive developer skill tree. 

Generate 0-3 NEW skill tree nodes for a specific user based on their recent activity and stats.

USER STATS:
- Total XP: ${userStats.totalXP}
- Commits: ${userStats.totalCommits}, PRs: ${userStats.totalPRs}
- LeetCode: ${userStats.leetcodeEasy}E / ${userStats.leetcodeMedium}M / ${userStats.leetcodeHard}H
- Codeforces: Rating ${userStats.codeforcesRating}, Solved ${userStats.codeforcesSolved}
- Dominant Skills: ${userStats.dominantSkills.join(', ') || 'None yet'}

RECENT ACTIVITIES (last 20):
${recentActivities.slice(0, 20).map(a => `- [${a.platform}] ${a.activityType}: ${a.description} (+${a.xpAwarded} XP)`).join('\n')}

EXISTING NODES:
${existingNodesSummary.map(n => `- ${n.nodeId}: ${n.name} (${n.path}, tier ${n.tier}, ${n.unlocked ? 'unlocked' : 'locked'})`).join('\n')}

RULES:
1. Only generate nodes that feel NATURAL given the user's actual activity
2. If user grinds LeetCode hard problems, generate algo/systems nodes
3. If user builds lots of frontend PRs, generate frontend nodes  
4. If user is well-rounded, generate architecture/leadership nodes
5. Node names should be MEMORABLE and slightly exaggerated (e.g., "Kernel Whisperer", "React Artisan")
6. Requirements should be ACHIEVABLE but require real effort (1.5-3x their current stats)
7. DO NOT duplicate existing node concepts
8. Return EMPTY newNodes array if nothing new is warranted
9. Position nodes so they don't overlap visually (spread X, increase Y per tier)`,
  });

  return object.newNodes;
}

/**
 * Generates the ROOT node + first tier of 3 path starter nodes for a brand new user.
 */
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
      requirements: { leetcode_tags_Database: 10 },
      xpReward: 120,
      parentIds: ['core-junior-dev'],
      justification: 'Default data starter path',
    },
  ];
}

/**
 * Recommends the next path/grind focus based on user activity.
 */
export async function recommendNextPath(
  activities: Array<{ platform: string; description: string }>
): Promise<string> {
  const { object } = await generateObject({
    model: groq('llama3-70b-8192'),
    schema: z.object({
      recommendedPath: z.enum(['Frontend Wizard', 'Systems Engineer', 'Data Scientist', 'Fullstack Legend', 'DevOps Architect']),
      reasoning: z.string(),
    }),
    prompt: `Based on this developer's recent activity, recommend their optimal grind path.

Activities:
${activities.slice(0, 10).map(a => `- ${a.platform}: ${a.description}`).join('\n')}

Return the best matching path and a one-sentence reasoning.`,
  });

  return object.recommendedPath;
}
