import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchGitHubMetrics, fetchPRDiff } from '@/lib/fetchers/github';
import { deepDiveGitHub } from '@/lib/fetchers/github-deepdive';
import { fetchLeetCodeMetrics } from '@/lib/fetchers/leetcode';
import { fetchCodeforcesMetrics } from '@/lib/fetchers/codeforces';
import { fetchHackerRankMetrics } from '@/lib/fetchers/hackerrank';
import { evaluatePRComplexity } from '@/lib/ai/groq';
import { XP_TABLE } from '@/lib/xp/normalize';
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
  let totalDeltaXP = 0;
  const now = new Date();
  const dateSlug = now.toISOString().split('T')[0]; // YYYY-MM-DD

  // Store previous stats for delta calculation
  const prevCommits = user.totalCommits;
  const prevPRs = user.totalPRs;
  const prevLeetcodeEasy = user.leetcodeEasy;
  const prevLeetcodeMedium = user.leetcodeMedium;
  const prevLeetcodeHard = user.leetcodeHard;
  const prevCodeforcesRating = user.codeforcesRating;
  const prevCodeforcesSolved = user.codeforcesSolved;
  const prevHackerrankBadges = user.hackerrankBadges;

  // Current stats (to be updated on user)
  let totalCommits = prevCommits;
  let totalPRs = prevPRs;
  let leetcodeEasy = prevLeetcodeEasy;
  let leetcodeMedium = prevLeetcodeMedium;
  let leetcodeHard = prevLeetcodeHard;
  let codeforcesRating = prevCodeforcesRating;
  let codeforcesSolved = prevCodeforcesSolved;
  let hackerrankBadges = prevHackerrankBadges;

  const isFirstSync = !user.lastSyncedGitHub && !user.lastSyncedLeetCode && !user.lastSyncedCodeforces && !user.lastSyncedHackerRank;
  let deepDiveResult: any = null;

  // ---------- GITHUB ----------
  if (user.githubHandle) {
    try {
      const ghMetrics = await fetchGitHubMetrics(user.githubHandle, process.env.GITHUB_TOKEN);
      // Never let stats regress — if API returns 0, keep the previous value
      totalCommits = Math.max(ghMetrics.commits, 0);
      totalPRs = Math.max(ghMetrics.mergedPRs, 0);
      // If API returns fewer than we already have, keep the higher value
      if (totalCommits < prevCommits && prevCommits > 0) {
        console.log(`[Sync] GitHub returned ${totalCommits} commits but we had ${prevCommits} — keeping previous value`);
        totalCommits = prevCommits;
      }
      if (totalPRs < prevPRs && prevPRs > 0) {
        console.log(`[Sync] GitHub returned ${totalPRs} PRs but we had ${prevPRs} — keeping previous value`);
        totalPRs = prevPRs;
      }

      // Delta commits XP
      const deltaCommits = Math.max(0, totalCommits - prevCommits);
      if (deltaCommits > 0) {
        const commitXP = deltaCommits * XP_TABLE.GITHUB.COMMIT;
        totalDeltaXP += commitXP;
        activities.push({
          userId: user.id,
          platform: 'GITHUB',
          activityType: 'COMMIT',
          description: `${deltaCommits} new commits (total: ${totalCommits})`,
          xpAwarded: commitXP,
          externalId: `github-commits-${user.id}-${dateSlug}`,
          metadata: { deltaCommits, totalCommits, languages: ghMetrics.languageDistribution },
        });
      }

      // Individual PRs (deduped by PR URL — process ALL, skip already-logged)
      const prScores: number[] = [];
      for (const pr of ghMetrics.recentPRs) {
        const existing = await prisma.activityLog.findUnique({
          where: { userId_externalId: { userId: user.id, externalId: pr.url } },
        });
        if (existing) continue;

        const diff = await fetchPRDiff(pr.url, process.env.GITHUB_TOKEN);
        let xp: number = XP_TABLE.GITHUB.PR_COMPLEX_BASE;
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
        totalDeltaXP += xp;
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

      const deltaEasy = Math.max(0, leetcodeEasy - prevLeetcodeEasy);
      const deltaMedium = Math.max(0, leetcodeMedium - prevLeetcodeMedium);
      const deltaHard = Math.max(0, leetcodeHard - prevLeetcodeHard);
      const deltaRatingMilestone = Math.max(0, Math.floor(lcMetrics.rating / 100) - Math.floor(user.leetcodeRating || 0 / 100));

      const lcXP = (deltaEasy * XP_TABLE.LEETCODE.EASY) +
                   (deltaMedium * XP_TABLE.LEETCODE.MEDIUM) +
                   (deltaHard * XP_TABLE.LEETCODE.HARD) +
                   (deltaRatingMilestone * XP_TABLE.LEETCODE.CONTEST_RATING_MILESTONE);

      if (lcXP > 0) {
        totalDeltaXP += lcXP;
        activities.push({
          userId: user.id,
          platform: 'LEETCODE',
          activityType: 'PROBLEM_SOLVED',
          description: `+${deltaEasy}E / +${deltaMedium}M / +${deltaHard}H (Rating: ${lcMetrics.rating})`,
          xpAwarded: lcXP,
          externalId: `leetcode-${user.id}-${dateSlug}`,
          metadata: { solved: lcMetrics.solved, rating: lcMetrics.rating, delta: { easy: deltaEasy, medium: deltaMedium, hard: deltaHard } },
        });
      }
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

      const deltaSolved = Math.max(0, codeforcesSolved - prevCodeforcesSolved);
      const deltaRatingMilestone = Math.max(0, Math.floor(codeforcesRating / 100) - Math.floor(prevCodeforcesRating / 100));

      let cfXP = (deltaSolved * XP_TABLE.CODEFORCES.PROBLEM_SOLVED) +
                 (deltaRatingMilestone * XP_TABLE.CODEFORCES.RATING_MILESTONE);

      // Rank up bonus (one-time per rank)
      const prevRankBonus = XP_TABLE.CODEFORCES.RANK_UP_BONUS[user.codeforcesRank?.toLowerCase()] || 0;
      const newRankBonus = XP_TABLE.CODEFORCES.RANK_UP_BONUS[cfMetrics.rank?.toLowerCase()] || 0;
      if (newRankBonus > prevRankBonus) {
        cfXP += newRankBonus - prevRankBonus;
      }

      if (cfXP > 0) {
        totalDeltaXP += cfXP;
        activities.push({
          userId: user.id,
          platform: 'CODEFORCES',
          activityType: 'CONTEST',
          description: `Rating: ${cfMetrics.rating}, Solved: ${cfMetrics.solvedCount} (+${deltaSolved})`,
          xpAwarded: cfXP,
          externalId: `codeforces-${user.id}-${dateSlug}`,
          metadata: { rank: cfMetrics.rank, maxRating: cfMetrics.maxRating, deltaSolved, deltaRatingMilestone },
        });
      }
    } catch (err) {
      console.error('Codeforces sync error for', user.codeforcesHandle, err);
    }
  }

  // ---------- HACKERRANK ----------
  if (user.hackerrankHandle) {
    try {
      const hrMetrics = await fetchHackerRankMetrics(user.hackerrankHandle);
      hackerrankBadges = hrMetrics.badges;

      const deltaBadges = Math.max(0, hackerrankBadges - prevHackerrankBadges);
      const hrXP = (deltaBadges * XP_TABLE.HACKERRANK.BADGE) +
                   (hrMetrics.certificates * XP_TABLE.HACKERRANK.CERTIFICATE) +
                   (hrMetrics.stars * XP_TABLE.HACKERRANK.STAR);

      if (hrXP > 0) {
        totalDeltaXP += hrXP;
        activities.push({
          userId: user.id,
          platform: 'HACKERRANK',
          activityType: 'BADGE',
          description: `${deltaBadges} new badges (total: ${hackerrankBadges})`,
          xpAwarded: hrXP,
          externalId: `hackerrank-${user.id}-${dateSlug}`,
          metadata: { badges: hackerrankBadges, certificates: hrMetrics.certificates, stars: hrMetrics.stars, deltaBadges },
        });
      }
    } catch (err) {
      console.error('HackerRank sync error for', user.hackerrankHandle, err);
    }
  }

  // ---------- CALCULATE FINAL XP ----------
  // XP only ever goes UP: current XP + delta. Never regress.
  // GitHub stats (commits, PRs) update the stored totals but XP doesn't go down.
  const finalXP = user.xp + totalDeltaXP;

  // ---------- UPDATE USER ----------
  await prisma.user.update({
    where: { id: user.id },
    data: {
      xp: finalXP,
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

  if (currentDynamicNodes.length === 0) {
    let initialNodes;
    if (deepDiveResult) {
      try {
        initialNodes = await generateInitialTreeFromDeepDive(deepDiveResult, {
          totalXP: totalDeltaXP || 0,
          totalCommits,
          totalPRs,
          leetcodeEasy,
          leetcodeMedium,
          leetcodeHard,
          codeforcesRating,
          codeforcesSolved,
        });
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

  // GROW TREE
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
      if (val === 0) continue;
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

  // ---------- SAVE DEEP DIVE DATA ----------
  if (deepDiveResult && isFirstSync) {
    await prisma.ghostSnapshot.create({
      data: {
        userId: user.id,
        weekNumber: 0,
        year: new Date().getFullYear(),
        totalXP: finalXP,
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

  // ---------- TRIGGER BADGE + TITLE GENERATION ----------
  if (totalDeltaXP > 0 || isFirstSync) {
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      // Fire-and-forget badge generation
      fetch(`${baseUrl}/api/badges`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${cronSecret}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      }).catch(() => {});

      // Fire-and-forget title generation
      fetch(`${baseUrl}/api/title`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${cronSecret}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      }).catch(() => {});
    }
  }

  console.log(`[Sync] ${user.email}: +${totalDeltaXP} delta XP (commits: +${totalCommits - prevCommits}, PRs processed)`);
}