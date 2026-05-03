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

const requirementsSchema = z.object({
  total_xp: z.number().describe("Total XP threshold"),
  leetcode_hard: z.number().describe("LeetCode hard problems solved threshold. 0 means not required"),
  leetcode_medium: z.number().describe("LeetCode medium problems solved threshold. 0 means not required"),
  leetcode_easy: z.number().describe("LeetCode easy problems solved threshold. 0 means not required"),
  github_prs: z.number().describe("GitHub PRs threshold. 0 means not required"),
  github_commits: z.number().describe("GitHub commits threshold. 0 means not required"),
  codeforces_rating: z.number().describe("Codeforces rating threshold. 0 means not required"),
  codeforces_solved: z.number().describe("Codeforces problems solved threshold. 0 means not required"),
  hackerrank_badges: z.number().describe("HackerRank badges threshold. 0 means not required"),
  tryhackme_points: z.number().describe("TryHackMe points threshold. 0 means not required"),
  tryhackme_badges: z.number().describe("TryHackMe badges threshold. 0 means not required"),
  tryhackme_rooms: z.number().describe("TryHackMe rooms completed threshold. 0 means not required"),
  skill_xp_Frontend: z.number().describe("Frontend XP threshold. 0 means not required"),
  skill_xp_Backend: z.number().describe("Backend XP threshold. 0 means not required"),
  skill_xp_DevOps: z.number().describe("DevOps XP threshold. 0 means not required"),
  skill_xp_Architecture: z.number().describe("Architecture XP threshold. 0 means not required"),
  skill_xp_Algo: z.number().describe("Algo XP threshold. 0 means not required"),
}).describe("Unlock requirements. Set fields to 0 if not required for this node. Only non-zero values are actual requirements.");

const nodeSchema = z.object({
  nodeId: z.string().describe("Unique kebab-case ID. Use prefixes: 'core-', 'fw-', 'se-', 'ds-', 'fs-', 'devops-', 'mob-', 'sec-'"),
  name: z.string().describe('Short, hype name for the skill'),
  description: z.string().describe('What it represents and how to unlock it'),
  path: z.string().describe('One of: Frontend Wizard, Systems Engineer, Data Scientist, Core, Fullstack Legend, DevOps Architect, Mobile Warrior, Security Phantom'),
  tier: z.number().int().min(1).max(10).describe('Depth in tree. Root=0, children=parent.tier+1'),
  positionX: z.number().int().describe('X coordinate on canvas. Range 0-1000'),
  positionY: z.number().int().describe('Y coordinate on canvas. Range 0-1000. Increase Y per tier'),
  requirements: requirementsSchema,
  xpReward: z.number().int().min(50).max(2000).describe('XP awarded when unlocked'),
  parentIds: z.array(z.string()).describe('Parent node IDs that must be unlocked first'),
  justification: z.string().describe('Why this node was generated for this user'),
});

const deepDiveNodeSchema = z.object({
  nodeId: z.string().describe("Unique kebab-case ID. Use prefixes: 'core-', 'fw-', 'se-', 'ds-', 'fs-', 'devops-', 'mob-', 'sec-'"),
  name: z.string().describe("Short HYPE name. Think gaming skill trees. Examples: 'DOM Surgeon', 'Kernel Whisperer', 'Pipeline Warlord'"),
  description: z.string().describe('2-3 sentences. What this node represents and the grind needed.'),
  path: z.string().describe('One of: Frontend Wizard, Systems Engineer, Data Scientist, Core, Fullstack Legend, DevOps Architect, Mobile Warrior, Security Phantom'),
  tier: z.number().int().min(0).max(5).describe('0=root, 1=first branch, 2=deeper, etc.'),
  positionX: z.number().int().describe('X on canvas 0-1000. Root=500. Spread paths apart.'),
  positionY: z.number().int().describe('Y on canvas 0-1000. Each tier adds 150-200.'),
  requirements: requirementsSchema,
  xpReward: z.number().int().min(25).max(500).describe('XP bonus when unlocked'),
  parentIds: z.array(z.string()).describe('Parent node IDs. Root node has empty array.'),
  unlocked: z.boolean().describe('Whether this should start unlocked. Root always true, starter nodes based on existing skills.'),
  justification: z.string().describe('Why this specific node was chosen for THIS user'),
});

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

  const object = await groqGenerateObject(z.object({
      newNodes: z.array(nodeSchema).max(3).describe('0-3 new nodes. Empty array if nothing new.'),
    }), `You are the AI Architect of Systemics, a competitive developer skill tree.

Generate 0-3 NEW skill tree nodes for a specific user based on their activity and stats.

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
2. Names should be MEMORABLE and slightly exaggerated (e.g., "Kernel Whisperer", "React Artisan")
3. Requirements should be ACHIEVABLE but require real effort (1.5-3x their current stats)
4. DO NOT duplicate existing node concepts
5. Return EMPTY newNodes array if nothing new is warranted
6. Position nodes to not overlap (spread X, increase Y per tier)`);

  return object.newNodes;
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
    .map(r => `- ${r.name} (${r.language || 'unknown'}, ${r.commitCount} commits, ${r.stars} stars): ${(r.description || 'No description').slice(0, 100)}`)
    .join('\n');

  const repoReadmeSnippets = repos
    .filter(r => r.readmeSnippet.length > 20)
    .slice(0, 5)
    .map(r => `[${r.name}]: ${r.readmeSnippet.slice(0, 150)}`)
    .join('\n');

  const recentCommits = repos
    .flatMap(r => r.recentCommitMessages.slice(0, 3).map(m => `[${r.name}] ${m}`))
    .slice(0, 20)
    .join('\n');

  const skillSummary = Object.entries(skillSignals)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

  const object = await groqGenerateObject(z.object({
      nodes: z.array(deepDiveNodeSchema).min(5).max(15).describe('5-15 nodes forming a personalized skill tree for this user.'),
    }), `You are the AI Architect of Systemics, building a PERSONALIZED skill tree for a developer based on their ENTIRE GitHub history.

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
2. Create 2-4 PATH branches at tier 1 that match the user's ACTUAL skills. If they're a frontend dev, make Frontend Wizard path prominent.
3. Create deeper nodes (tier 2-3) that represent REAL skills this user clearly has based on their repos
4. If user has STRONG signals in an area, make those nodes UNLOCKED (they've already earned them)
5. For weaker signals, make nodes LOCKED with reasonable requirements
6. Names must be MEMORABLE and HYPE (gaming-style). No generic names.
7. Requirements should be ACHIEVABLE — roughly 1.2-2x their current stats for the next level, higher for further nodes
8. This tree should feel PERSONAL — like an AI actually studied their whole dev history
9. Position nodes so paths spread out horizontally (X) and deepen vertically (Y)
10. Include at least one node per dominant skill area

Create a tree that makes this developer say "damn, that AI really studied my whole GitHub"`);

  return object.nodes;
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
  const object = await groqGenerateObject(z.object({
      recommendedPath: z.enum(['Frontend Wizard', 'Systems Engineer', 'Data Scientist', 'Fullstack Legend', 'DevOps Architect']),
      reasoning: z.string(),
    }), `Based on this developer's recent activity, recommend their optimal grind path.

Activities:
${activities.slice(0, 10).map(a => `- ${a.platform}: ${a.description}`).join('\n')}

Return the best matching path and a one-sentence reasoning.`);

  return object.recommendedPath;
}