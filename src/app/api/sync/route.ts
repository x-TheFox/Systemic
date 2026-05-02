import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchGitHubMetrics, fetchPRDiff } from '@/lib/fetchers/github';
import { fetchLeetCodeMetrics } from '@/lib/fetchers/leetcode';
import { fetchCodeforcesMetrics } from '@/lib/fetchers/codeforces';
import { fetchHackerRankMetrics } from '@/lib/fetchers/hackerrank';
import { evaluatePRComplexity } from '@/lib/ai/groq';
import { calculateGitHubXP, calculateLeetCodeXP, calculateCodeforcesXP, calculateHackerRankXP } from '@/lib/xp/normalize';
import { triggerMilestone } from '@/lib/pusher/server';
import { checkNodeUnlock, getAvailableNodes } from '@/lib/skilltree/unlock';
import { createWeeklySnapshot } from '@/lib/ai/ghost';
import { SKILL_TREE_NODES } from '@/lib/skilltree/definitions';

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

      // GitHub
      if (user.githubHandle) {
        const ghMetrics = await fetchGitHubMetrics(user.githubHandle, process.env.GITHUB_TOKEN);
        totalCommits = ghMetrics.commits;
        totalPRs = ghMetrics.mergedPRs;

        const prScores: number[] = [];
        for (const pr of ghMetrics.recentPRs.slice(0, 5)) {
          const diff = await fetchPRDiff(pr.url, process.env.GITHUB_TOKEN);
          if (diff) {
            try {
              const analysis = await evaluatePRComplexity(diff, pr.title);
              prScores.push(analysis.xp);

              activities.push({
                userId: user.id,
                platform: 'GITHUB',
                activityType: 'PR',
                description: pr.title,
                xpAwarded: analysis.xp,
                metadata: { category: analysis.category, justification: analysis.justification, url: pr.url },
              });
            } catch {
              prScores.push(30);
              activities.push({
                userId: user.id,
                platform: 'GITHUB',
                activityType: 'PR',
                description: pr.title,
                xpAwarded: 30,
                metadata: { url: pr.url },
              });
            }
          }
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

      // LeetCode
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

      // Codeforces
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

      // HackerRank
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

      // Update user aggregated stats
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
        },
      });

      // Create activity logs
      for (const activity of activities) {
        await prisma.activityLog.create({ data: activity });
      }

      // Check skill tree unlocks
      const availableNodes = await getAvailableNodes(user.id);
      const state = await prisma.skillTreeState.findUnique({ where: { userId: user.id } });
      const unlocked = new Set(state?.unlockedNodes || []);
      const newlyUnlocked: string[] = [];

      for (const nodeId of availableNodes) {
        if (unlocked.has(nodeId)) continue;
        const check = await checkNodeUnlock(user.id, nodeId);
        if (check.unlocked) {
          newlyUnlocked.push(nodeId);
          unlocked.add(nodeId);

          const node = SKILL_TREE_NODES.find((n) => n.id === nodeId);
          if (node) {
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
      }

      if (newlyUnlocked.length > 0) {
        await prisma.skillTreeState.upsert({
          where: { userId: user.id },
          update: { unlockedNodes: Array.from(unlocked) },
          create: { userId: user.id, unlockedNodes: Array.from(unlocked) },
        });
      }

      // Create ghost snapshot
      await createWeeklySnapshot(user.id);

      results.push({
        userId: user.id,
        email: user.email,
        xpGained: totalXP,
        newlyUnlocked,
        activities: activities.length,
      });
    }

    return NextResponse.json({ success: true, processedUsers: users.length, results });
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
