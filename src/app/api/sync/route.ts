import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchGitHubMetrics, fetchPRDiff } from '@/lib/fetchers/github';
import { fetchLeetCodeMetrics } from '@/lib/fetchers/leetcode';
import { fetchCodeforcesMetrics } from '@/lib/fetchers/codeforces';
import { fetchHackerRankMetrics } from '@/lib/fetchers/hackerrank';
import { evaluatePRComplexity } from '@/lib/ai/groq';
import { calculateGitHubXP, calculateLeetCodeXP, calculateCodeforcesXP, calculateHackerRankXP } from '@/lib/xp/normalize';
import { triggerMilestone } from '@/lib/pusher/server';
import { createWeeklySnapshot } from '@/lib/ai/ghost';
import { generatePersonalizedSkillTree, generateInitialSkillTree } from '@/lib/ai/skillTreeGenerator';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await prisma.user.findMany();
    const results = [];

    for (const user of users) {
      const activities = [];
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

      // ---------- GITHUB ----------
      if (user.githubHandle) {
        const ghMetrics = await fetchGitHubMetrics(user.githubHandle, process.env.GITHUB_TOKEN);
        totalCommits = ghMetrics.commits;
        totalPRs = ghMetrics.mergedPRs;

        const prScores: number[] = [];
        for (const pr of ghMetrics.recentPRs.slice(0, 5)) {
          // Deduplication: skip if we've already logged this PR
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
            } catch {
              // fallback already set
            }
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
      }

      // ---------- LEETCODE ----------
      if (user.leetcodeHandle) {
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
      }

      // ---------- CODEFORCES ----------
      if (user.codeforcesHandle) {
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
      }

      // ---------- HACKERRANK ----------
      if (user.hackerrankHandle) {
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
        await prisma.activityLog.create({ data: activity });
      }

      // ---------- AI SKILL TREE GROWTH ----------
      const currentDynamicNodes = await prisma.dynamicSkillNode.findMany({
        where: { userId: user.id },
      });

      // Initialize tree for new users
      if (currentDynamicNodes.length === 0) {
        const initialNodes = await generateInitialSkillTree();
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
              generatedBy: 'system',
            },
          });
        }
      }

      // Get recent activities for AI tree generation
      const recentLogs = await prisma.activityLog.findMany({
        where: { userId: user.id },
        orderBy: { timestamp: 'desc' },
        take: 20,
      });

      const freshUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (!freshUser) continue;

      // Calculate dominant skills
      const skillXP: Record<string, number> = {};
      for (const log of recentLogs) {
        const cat = (log.metadata as any)?.category || 'Algo';
        skillXP[cat] = (skillXP[cat] || 0) + log.xpAwarded;
      }
      const dominantSkills = Object.entries(skillXP)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k]) => k);

      // Try to grow the tree
      const mappedCurrent = currentDynamicNodes.map((n) => ({
        nodeId: n.nodeId,
        name: n.name,
        description: n.description,
        path: n.path,
        tier: n.tier,
        positionX: n.positionX,
        positionY: n.positionY,
        requirements: n.requirements as Record<string, unknown>,
        xpReward: n.xpReward,
        parentIds: n.parentIds,
        unlocked: n.unlocked,
        justification: '',
      }));

      try {
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

          await triggerMilestone('new-activity', {
            userId: user.id,
            userName: user.name || user.email,
            message: `The Ghost revealed a new skill node: ${node.name}!`,
            metadata: { type: 'ai-tree-growth', nodeId: node.nodeId },
          });
        }
      } catch (err) {
        console.warn('AI tree generation failed for user', user.id, err);
      }

      // ---------- CHECK DYNAMIC NODE UNLOCKS ----------
      const allNodes = await prisma.dynamicSkillNode.findMany({
        where: { userId: user.id },
      });
      const unlockedIds = allNodes.filter((n) => n.unlocked).map((n) => n.nodeId);

      for (const node of allNodes) {
        if (node.unlocked) continue;

        // Check parent prerequisites
        const parentsUnlocked = node.parentIds.every((pid) => unlockedIds.includes(pid));
        if (!parentsUnlocked) continue;

        // Check stat requirements
        const reqs = node.requirements as Record<string, number>;
        let met = true;
        for (const [key, val] of Object.entries(reqs)) {
          let current = 0;
          if (key === 'total_xp') current = freshUser.xp;
          else if (key === 'leetcode_hard') current = freshUser.leetcodeHard;
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
        (now.getTime() - user.lastGhostSnapshotAt.getTime()) > 6 * 24 * 60 * 60 * 1000; // ~6 days

      if (shouldSnapshot) {
        await createWeeklySnapshot(user.id);
        await prisma.user.update({
          where: { id: user.id },
          data: { lastGhostSnapshotAt: now },
        });
      }

      results.push({
        userId: user.id,
        email: user.email,
        xpGained: totalXP,
        activities: activities.length,
      });
    }

    return NextResponse.json({ success: true, processedUsers: users.length, results });
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
