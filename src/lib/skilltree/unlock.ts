import { prisma } from '@/lib/prisma';
import { SKILL_TREE_NODES, type SkillNode } from './definitions';

export interface UnlockCheck {
  unlocked: boolean;
  missing: string[];
  progress: Record<string, { current: number; required: number }>;
}

export async function checkNodeUnlock(userId: string, nodeId: string): Promise<UnlockCheck> {
  const node = SKILL_TREE_NODES.find((n) => n.id === nodeId);
  if (!node) return { unlocked: false, missing: ['Node not found'], progress: {} };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      activityLogs: true,
      skillTreeState: true,
    },
  });

  if (!user) return { unlocked: false, missing: ['User not found'], progress: {} };

  const missing: string[] = [];
  const progress: Record<string, { current: number; required: number }> = {};
  let allMet = true;

  for (const req of node.requirements) {
    let current = 0;
    let met = false;

    switch (req.type) {
      case 'total_xp':
        current = user.xp;
        met = current >= req.value;
        progress['total_xp'] = { current, required: req.value };
        break;

      case 'leetcode_difficulty':
        current = user.leetcodeHard;
        met = current >= req.value;
        progress['leetcode_hard'] = { current, required: req.value };
        break;

      case 'leetcode_tags': {
        const tagCounts = await getLeetCodeTagCounts(userId, req.tags || []);
        current = tagCounts.total;
        met = current >= req.value;
        progress[`leetcode_tags_${req.tags?.join('_')}`] = { current, required: req.value };
        break;
      }

      case 'github_prs':
        current = user.totalPRs;
        met = current >= req.value;
        progress['github_prs'] = { current, required: req.value };
        break;

      case 'github_commits':
        current = user.totalCommits;
        met = current >= req.value;
        progress['github_commits'] = { current, required: req.value };
        break;

      case 'codeforces_rating':
        current = user.codeforcesRating;
        met = current >= req.value;
        progress['codeforces_rating'] = { current, required: req.value };
        break;

      case 'codeforces_solved':
        current = user.codeforcesSolved;
        met = current >= req.value;
        progress['codeforces_solved'] = { current, required: req.value };
        break;

      case 'hackerrank_badges':
        current = user.hackerrankBadges;
        met = current >= req.value;
        progress['hackerrank_badges'] = { current, required: req.value };
        break;

      case 'skill_xp': {
        const skillXP = await getSkillXP(userId, req.platform || '');
        current = skillXP;
        met = current >= req.value;
        progress[`skill_xp_${req.platform}`] = { current, required: req.value };
        break;
      }

      default:
        missing.push(`Unknown requirement type: ${req.type}`);
        allMet = false;
        continue;
    }

    if (!met) {
      allMet = false;
      missing.push(`${req.type}: ${current}/${req.value}`);
    }
  }

  return { unlocked: allMet, missing, progress };
}

export async function getAvailableNodes(userId: string): Promise<string[]> {
  const state = await prisma.skillTreeState.findUnique({ where: { userId } });
  const unlocked = new Set(state?.unlockedNodes || []);
  const available: string[] = [];

  for (const node of SKILL_TREE_NODES) {
    if (unlocked.has(node.id)) continue;

    // Check if any parent is unlocked (or if it's the root)
    const hasUnlockedParent = node.tier === 0 || SKILL_TREE_NODES.some(
      (n) => unlocked.has(n.id) && SKILL_TREE_EDGES.some(
        (e) => e.source === n.id && e.target === node.id
      )
    );

    if (hasUnlockedParent || node.tier === 0) {
      available.push(node.id);
    }
  }

  return available;
}

async function getLeetCodeTagCounts(userId: string, tags: string[]): Promise<{ total: number }> {
  const logs = await prisma.activityLog.findMany({
    where: {
      userId,
      platform: 'LEETCODE',
      metadata: {
        path: ['tags'],
        array_contains: tags,
      },
    },
  });

  return { total: logs.length };
}

async function getSkillXP(userId: string, platform: string): Promise<number> {
  const logs = await prisma.activityLog.findMany({
    where: {
      userId,
      metadata: {
        path: ['category'],
        equals: platform,
      },
    },
  });

  return logs.reduce((sum, log) => sum + log.xpAwarded, 0);
}

import { SKILL_TREE_EDGES } from './definitions';
