import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchGitHubMetrics, fetchPRDiff } from '@/lib/fetchers/github';
import { deepDiveGitHub } from '@/lib/fetchers/github-deepdive';
import { fetchLeetCodeMetrics } from '@/lib/fetchers/leetcode';
import { fetchCodeforcesMetrics } from '@/lib/fetchers/codeforces';
import { fetchHackerRankMetrics } from '@/lib/fetchers/hackerrank';
import { evaluatePRComplexity } from '@/lib/ai/groq';
import { calculateGitHubXP, calculateLeetCodeXP, calculateCodeforcesXP, calculateHackerRankXP } from '@/lib/xp/normalize';
import { triggerMilestone } from '@/lib/pusher/server';
import { createWeeklySnapshot } from '@/lib/ai/ghost';
import { generatePersonalizedSkillTree, generateInitialTreeFromDeepDive, generateInitialSkillTree } from '@/lib/ai/skillTreeGenerator';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await prisma.user.findMany();
    const results = [];

    for (const user of users) {
      try {
        await syncUser(user);
        results.push({ userId: user.id, email: user.email, status: 'ok' });
      } catch (err: any) {
        console.error(`Sync failed for user ${user.id}:`, err);
        results.push({ userId: user.id, email: user.email, status: 'error', error: err.message });
      }
    }

    return NextResponse.json({ success: true, processedUsers: users.length, results });
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function syncUser(user: any) {
  const activities: any[] = [];
  let totalXP = 0;
  let totalCommits = 0;
  let totalPRs = 0;
  let leetcodeEasy = 0;
  let leetcodeMedium = 0;
  let leetcodeHard = 0;
  let codeforcesRating = 0;
  let codeforcesSolved = 0;
  let hackerrankBadges = 0;
  const now = new Date();

  const isFirstSync = !user.lastSyncedGitHub && !user.lastSyncedLeetCode && !user.lastSyncedCodeforces && !user.lastSyncedHackerRank;
  let deepDiveResult: any = null;

  // ---------- GITHUB ----------
  if (user.githubHandle) {
    try {
      const ghMetrics = await fetchGitHubMetrics(user.githubHandle, process.env.GITHUB_TOKEN);
      totalCommits = ghMetrics.commits;
      totalPRs = ghMetrics.mergedPRs;

      const prScores: number[] = [];
      for (const pr of ghMetrics.recentPRs.slice(0, 5)) {
        const existing = await prisma.activityLog.findUnique({
          where: { userId_externalId: { userId: user.id, externalId: pr.url } },
        });
        if (existing) continue;

        const diff = await fetchPRDiff(pr.url, process.env.GITHUB_TOKEN);
        let xp = 30;
        let category = 'Backend';
        let justification = 'Default scoring';

        if (diff) {
          try {
            const analysis = await evaluatePRComplexity(diff, pr.title);
            xp = analysis.xp;
            category = analysis.category;
            justification = analysis.justification;
          } catch {}
        }

        prScores.push(xp);
        activities.push({
          userId: user.id,
          platform: 'GITHUB',
          activityType: 'PR',
          description: pr.title,
          xpAwarded: xp,
          externalId: pr.url,
          metadata: { category, justification, url: pr.url },
        });
      }

      const ghXP = calculateGitHubXP(ghMetrics.commits, ghMetrics.mergedPRs, prScores);
      totalXP += ghXP;

      if (ghMetrics.commits > 0) {
        activities.push({
          userId: user.id,
          platform: 'GITHUB',
          activityType: 'COMMIT',
          description: `${ghMetrics.commits} commits`,
          xpAwarded: ghMetrics.commits * 5,
          metadata: { languages: ghMetrics.languageDistribution },
        });
      }

      // DEEP DIVE on first sync
      if (isFirstSync && process.env.GITHUB_TOKEN) {
        try {
          deepDiveResult = await deepDiveGitHub(user.githubHandle, process.env.GITHUB_TOKEN);
          console.log(`Deep dive completed for ${user.githubHandle}: ${deepDiveResult.repos.length} repos analyzed, path=${deepDiveResult.dominantPath}`);
        } catch (err) {
          console.error('Deep dive failed for', user.githubHandle, err);
        }
      }
    } catch (err) {
      console.error('GitHub sync error for', user.githubHandle, err);
    }
  }

  // ---------- LEETCODE ----------
  if (user.leetcodeHandle) {
    try {
      const lcMetrics = await fetchLeetCodeMetrics(user.leetcodeHandle);
      leetcodeEasy = lcMetrics.solved.easy;
      leetcodeMedium = lcMetrics.solved.medium;
      leetcodeHard = lcMetrics.solved.hard;

      const lcXP = calculateLeetCodeXP(lcMetrics.solved, lcMetrics.rating);
      totalXP += lcXP;

      activities.push({
        userId: user.id,
        platform: 'LEETCODE',
        activityType: 'PROBLEM_SOLVED',
        description: `Solved ${lcMetrics.solved.total} problems (Rating: ${lcMetrics.rating})`,
        xpAwarded: lcXP,
        metadata: { solved: lcMetrics.solved, rating: lcMetrics.rating },
      });
    } catch (err) {
      console.error('LeetCode sync error for', user.leetcodeHandle, err);
    }
  }

  // ---------- CODEFORCES ----------
  if (user.codeforcesHandle) {
    try {
      const cfMetrics = await fetchCodeforcesMetrics(user.codeforcesHandle);
      codeforcesRating = cfMetrics.rating;
      codeforcesSolved = cfMetrics.solvedCount;

      const cfXP = calculateCodeforcesXP(cfMetrics.solvedCount, cfMetrics.rating, cfMetrics.rank);
      totalXP += cfXP;

      activities.push({
        userId: user.id,
        platform: 'CODEFORCES',
        activityType: 'CONTEST',
        description: `Rating: ${cfMetrics.rating}, Solved: ${cfMetrics.solvedCount}`,
        xpAwarded: cfXP,
        metadata: { rank: cfMetrics.rank, maxRating: cfMetrics.maxRating },
      });
    } catch (err) {
      console.error('Codeforces sync error for', user.codeforcesHandle, err);
    }
  }

  // ---------- HACKERRANK ----------
  if (user.hackerrankHandle) {
    try {
      const hrMetrics = await fetchHackerRankMetrics(user.hackerrankHandle);
      hackerrankBadges = hrMetrics.badges;

      const hrXP = calculateHackerRankXP(hrMetrics.badges, hrMetrics.certificates, hrMetrics.stars);
      totalXP += hrXP;

      if (hrMetrics.badges > 0) {
        activities.push({
          userId: user.id,
          platform: 'HACKERRANK',
          activityType: 'BADGE',
          description: `${hrMetrics.badges} badges earned`,
          xpAwarded: hrXP,
          metadata: { badges: hrMetrics.badges, certificates: hrMetrics.certificates },
        });
      }
    } catch (err) {
      console.error('HackerRank sync error for', user.hackerrankHandle, err);
    }
  }

  // ---------- UPDATE USER ----------
  await prisma.user.update({
    where: { id: user.id },
    data: {
      xp: { increment: totalXP },
      totalCommits,
      totalPRs,
      leetcodeEasy,
      leetcodeMedium,
      leetcodeHard,
      codeforcesRating,
      codeforcesSolved,
      hackerrankBadges,
      lastSyncedGitHub: user.githubHandle ? now : user.lastSyncedGitHub,
      lastSyncedLeetCode: user.leetcodeHandle ? now : user.lastSyncedLeetCode,
      lastSyncedCodeforces: user.codeforcesHandle ? now : user.lastSyncedCodeforces,
      lastSyncedHackerRank: user.hackerrankHandle ? now : user.lastSyncedHackerRank,
    },
  });

  // ---------- CREATE ACTIVITY LOGS ----------
  for (const activity of activities) {
    try {
      await prisma.activityLog.create({ data: activity });
    } catch (err: any) {
      if (!err.message?.includes('Unique constraint')) {
        console.error('Activity log error:', err);
      }
    }
  }

  // ---------- SKILL TREE ----------
  const currentDynamicNodes = await prisma.dynamicSkillNode.findMany({
    where: { userId: user.id },
  });

  // INITIAL TREE - Generate from deep dive if available, otherwise defaults
  if (currentDynamicNodes.length === 0) {
    let initialNodes;

    if (deepDiveResult) {
      try {
        initialNodes = await generateInitialTreeFromDeepDive(deepDiveResult, {
          totalXP: totalXP || 0,
          totalCommits,
          totalPRs,
          leetcodeEasy,
          leetcodeMedium,
          leetcodeHard,
          codeforcesRating,
          codeforcesSolved,
        });
        console.log(`Generated personalized tree from deep dive: ${initialNodes.length} nodes for ${user.email}`);
      } catch (err) {
        console.error('Deep dive tree generation failed, using defaults:', err);
        initialNodes = await generateInitialSkillTree();
      }
    } else {
      initialNodes = await generateInitialSkillTree();
    }

    for (const node of initialNodes) {
      await prisma.dynamicSkillNode.create({
        data: {
          userId: user.id,
          nodeId: node.nodeId,
          name: node.name,
          description: node.description,
          path: node.path,
          tier: node.tier,
          positionX: node.positionX,
          positionY: node.positionY,
          requirements: node.requirements as any,
          xpReward: node.xpReward,
          parentIds: node.parentIds,
          generatedBy: deepDiveResult ? 'ai' : 'system',
          unlocked: node.unlocked ?? (node.tier === 0),
        },
      });
    }
  }

  // GROW TREE - Try to add nodes based on recent activity
  try {
    const recentLogs = await prisma.activityLog.findMany({
      where: { userId: user.id },
      orderBy: { timestamp: 'desc' },
      take: 20,
    });

    const freshUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!freshUser) return;

    const skillXP: Record<string, number> = {};
    for (const log of recentLogs) {
      const cat = (log.metadata as any)?.category || 'Algo';
      skillXP[cat] = (skillXP[cat] || 0) + log.xpAwarded;
    }
    const dominantSkills = Object.entries(skillXP)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k);

    const mappedCurrent = currentDynamicNodes.map((n) => ({
      nodeId: n.nodeId,
      name: n.name,
      description: n.description,
      path: n.path,
      tier: n.tier,
      positionX: n.positionX,
      positionY: n.positionY,
      requirements: n.requirements as Record<string, number>,
      xpReward: n.xpReward,
      parentIds: n.parentIds,
      unlocked: n.unlocked,
      justification: '',
    }));

    const newNodes = await generatePersonalizedSkillTree(
      user.id,
      recentLogs.map((l) => ({
        platform: l.platform,
        activityType: l.activityType,
        description: l.description || '',
        xpAwarded: l.xpAwarded,
        metadata: (l.metadata as Record<string, unknown>) || undefined,
      })),
      mappedCurrent,
      {
        totalXP: freshUser.xp,
        totalCommits: freshUser.totalCommits,
        totalPRs: freshUser.totalPRs,
        leetcodeEasy: freshUser.leetcodeEasy,
        leetcodeMedium: freshUser.leetcodeMedium,
        leetcodeHard: freshUser.leetcodeHard,
        codeforcesRating: freshUser.codeforcesRating,
        codeforcesSolved: freshUser.codeforcesSolved,
        dominantSkills,
      }
    );

    for (const node of newNodes) {
      try {
        await prisma.dynamicSkillNode.create({
          data: {
            userId: user.id,
            nodeId: node.nodeId,
            name: node.name,
            description: node.description,
            path: node.path,
            tier: node.tier,
            positionX: node.positionX,
            positionY: node.positionY,
            requirements: node.requirements as any,
            xpReward: node.xpReward,
            parentIds: node.parentIds,
            generatedBy: 'ai',
          },
        });
      } catch (err: any) {
        if (err.message?.includes('Unique constraint')) continue;
        throw err;
      }

      await triggerMilestone('new-activity', {
        userId: user.id,
        userName: user.name || user.email,
        message: `The Ghost revealed a new skill node: ${node.name}!`,
        metadata: { type: 'ai-tree-growth', nodeId: node.nodeId },
      });
    }
  } catch (err) {
    console.warn('AI tree growth failed for user', user.id, err);
  }

  // ---------- CHECK DYNAMIC NODE UNLOCKS ----------
  const allNodes = await prisma.dynamicSkillNode.findMany({
    where: { userId: user.id },
  });
  const unlockedIds = allNodes.filter((n) => n.unlocked).map((n) => n.nodeId);
  const freshUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!freshUser) return;

  const recentLogs = await prisma.activityLog.findMany({
    where: { userId: user.id },
    orderBy: { timestamp: 'desc' },
    take: 50,
  });
  const skillXP: Record<string, number> = {};
  for (const log of recentLogs) {
    const cat = (log.metadata as any)?.category || 'Algo';
    skillXP[cat] = (skillXP[cat] || 0) + log.xpAwarded;
  }

  for (const node of allNodes) {
    if (node.unlocked) continue;
    const parentsUnlocked = node.parentIds.every((pid) => unlockedIds.includes(pid));
    if (!parentsUnlocked) continue;

    const reqs = node.requirements as Record<string, number>;
    let met = true;
    for (const [key, val] of Object.entries(reqs)) {
      if (val === 0) continue; // 0 means not required
      let current = 0;
      if (key === 'total_xp') current = freshUser.xp;
      else if (key === 'leetcode_hard') current = freshUser.leetcodeHard;
      else if (key === 'leetcode_medium') current = freshUser.leetcodeMedium;
      else if (key === 'leetcode_easy') current = freshUser.leetcodeEasy;
      else if (key === 'github_prs') current = freshUser.totalPRs;
      else if (key === 'github_commits') current = freshUser.totalCommits;
      else if (key === 'codeforces_rating') current = freshUser.codeforcesRating;
      else if (key === 'codeforces_solved') current = freshUser.codeforcesSolved;
      else if (key === 'hackerrank_badges') current = freshUser.hackerrankBadges;
      else if (key.startsWith('skill_xp_')) {
        const skill = key.replace('skill_xp_', '');
        current = skillXP[skill] || 0;
      }
      if (current < val) { met = false; break; }
    }

    if (met) {
      await prisma.dynamicSkillNode.update({
        where: { id: node.id },
        data: { unlocked: true },
      });
      unlockedIds.push(node.nodeId);

      await prisma.achievement.create({
        data: {
          userId: user.id,
          title: `Unlocked: ${node.name}`,
          description: node.description,
          xpBonus: node.xpReward,
        },
      });

      await triggerMilestone('node-unlocked', {
        userId: user.id,
        userName: user.name || user.email,
        message: `${user.name || user.email} unlocked ${node.name}!`,
        xp: node.xpReward,
      });
    }
  }

  // ---------- GHOST SNAPSHOT (WEEKLY ONLY) ----------
  const shouldSnapshot = !user.lastGhostSnapshotAt ||
    (now.getTime() - user.lastGhostSnapshotAt.getTime()) > 6 * 24 * 60 * 60 * 1000;

  if (shouldSnapshot) {
    await createWeeklySnapshot(user.id);
    await prisma.user.update({
      where: { id: user.id },
      data: { lastGhostSnapshotAt: now },
    });
  }

  // ---------- SAVE DEEP DIVE DATA TO GHOST SNAPSHOT ----------
  if (deepDiveResult && isFirstSync) {
    await prisma.ghostSnapshot.create({
      data: {
        userId: user.id,
        weekNumber: 0,
        year: new Date().getFullYear(),
        totalXP: totalXP,
        skillBreakdown: deepDiveResult.skillSignals,
        activityCounts: {
          deepDive: true,
          repos: deepDiveResult.repos.map((r: any) => ({ name: r.name, language: r.language, commits: r.commitCount })),
          languageBreakdown: deepDiveResult.languageBreakdown,
          dominantPath: deepDiveResult.dominantPath,
        },
      },
    }).catch(() => {});
  }
}
