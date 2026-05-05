import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchGitHubMetrics, fetchPRDiff, fetchCommitMessages } from '@/lib/fetchers/github';
import { deepDiveGitHub } from '@/lib/fetchers/github-deepdive';
import { fetchLeetCodeMetrics } from '@/lib/fetchers/leetcode';
import { fetchCodeforcesMetrics } from '@/lib/fetchers/codeforces';
import { fetchHackerRankMetrics } from '@/lib/fetchers/hackerrank';
import { evaluatePRComplexity, evaluateCommitBatch } from '@/lib/ai/groq';
import { XP_TABLE, getIntensityMultiplier, getStreakMultiplier, calculateMilestoneBonuses } from '@/lib/xp/normalize';
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

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    // SINGLE USER SYNC - called by GitHub Actions loop
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      try {
        await syncUser(user);
        return NextResponse.json({ success: true, userId: user.id, email: user.email, status: 'ok' });
      } catch (err: any) {
        console.error(`Sync failed for user ${user.id}:`, err);
        return NextResponse.json({ success: false, userId: user.id, error: err.message }, { status: 500 });
      }
    }

    // ORCHESTRATION MODE - return list of users needing sync
    const users = await prisma.user.findMany({
      select: { id: true, email: true },
      orderBy: { updatedAt: 'asc' }, // sync stalest first
    });

    return NextResponse.json({ users, count: users.length });
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
  let totalReviews = user.totalReviews;
  let reviewComments = user.reviewComments;
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
      // Never let stats regress - if API returns 0, keep the previous value
      totalCommits = Math.max(ghMetrics.commits, 0);
      totalPRs = Math.max(ghMetrics.mergedPRs, 0);
      // If API returns fewer than we already have, keep the higher value
      if (totalCommits < prevCommits && prevCommits > 0) {
        console.log(`[Sync] GitHub returned ${totalCommits} commits but we had ${prevCommits} - keeping previous value`);
        totalCommits = prevCommits;
      }
      if (totalPRs < prevPRs && prevPRs > 0) {
        console.log(`[Sync] GitHub returned ${totalPRs} PRs but we had ${prevPRs} - keeping previous value`);
        totalPRs = prevPRs;
      }

      // Delta commits XP with LLM weighting + intensity multiplier
      const deltaCommits = Math.max(0, totalCommits - prevCommits);
      if (deltaCommits > 0) {
        let commitXP = 0;
        let avgCommitScore = 5;
        let scoredCount = 0;

        // Try to fetch and score commit messages for weighted XP
        try {
          const since = user.lastSyncedGitHub || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          const commitMessages = await fetchCommitMessages(user.githubHandle, process.env.GITHUB_TOKEN, since, 5);
          // Take only the newest deltaCommits messages
          const recentMessages = commitMessages.slice(0, deltaCommits).map((c) => c.message);

          if (recentMessages.length > 0) {
            const { totalXP, scores } = await evaluateCommitBatch(recentMessages);
            commitXP = totalXP;
            avgCommitScore = scores.length > 0
              ? scores.reduce((s, c) => s + c.score, 0) / scores.length
              : 5;
            scoredCount = scores.length;

            // Pad with average if we have fewer scored commits than delta
            if (scoredCount < deltaCommits) {
              const remaining = deltaCommits - scoredCount;
              const avgXP = commitXP / scoredCount;
              commitXP += Math.round(remaining * avgXP);
            }
          } else {
            // Fallback to flat rate if no messages fetched
            commitXP = deltaCommits * XP_TABLE.GITHUB.COMMIT;
          }
        } catch (err) {
          console.warn('[Sync] Commit weighting failed, using flat rate:', err);
          commitXP = deltaCommits * XP_TABLE.GITHUB.COMMIT;
        }

        // Apply intensity multiplier
        const intensityMult = getIntensityMultiplier(deltaCommits);
        const finalCommitXP = Math.round(commitXP * intensityMult);
        totalDeltaXP += finalCommitXP;

        activities.push({
          userId: user.id,
          platform: 'GITHUB',
          activityType: 'COMMIT',
          description: `${deltaCommits} new commits (avg quality: ${avgCommitScore.toFixed(1)}/10)${intensityMult > 1 ? ` [${intensityMult}x intensity]` : ''}`,
          xpAwarded: finalCommitXP,
          externalId: `github-commits-${user.id}-${dateSlug}`,
          metadata: {
            deltaCommits,
            totalCommits,
            scoredCount,
            avgScore: avgCommitScore,
            intensityMult,
            languages: ghMetrics.languageDistribution,
          },
        });
      }

      // Individual PRs (deduped by PR URL - process ALL, skip already-logged)
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
          timestamp: new Date(pr.mergedAt || pr.createdAt),
          metadata: { category, justification, url: pr.url },
        });
      }

      // Code reviews
      try {
        const { fetchGitHubReviews } = await import('@/lib/fetchers/github');
        const reviews = await fetchGitHubReviews(user.githubHandle, process.env.GITHUB_TOKEN);
        if (reviews.totalReviews > 0) {
          totalReviews = Math.max(totalReviews, reviews.totalReviews);
          reviewComments = Math.max(reviewComments, reviews.reviewComments);
          const reviewXP = reviews.totalReviews * XP_TABLE.GITHUB.REVIEW;
          totalDeltaXP += reviewXP;
          activities.push({
            userId: user.id,
            platform: 'GITHUB',
            activityType: 'REVIEW',
            description: `${reviews.totalReviews} PR reviews`,
            xpAwarded: reviewXP,
            externalId: `github-reviews-${user.id}-${dateSlug}`,
            metadata: { totalReviews: reviews.totalReviews, reviewComments: reviews.reviewComments },
          });
        }
      } catch (err) {
        console.warn('[Sync] Code review fetch failed for', user.githubHandle, err);
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

      // QUEUE PROJECTS for AI analysis
      if (process.env.GITHUB_TOKEN) {
        try {
          const { fetchGitHubRepos, checkForkContribution } = await import('@/lib/fetchers/github-repos');
          const repos = await fetchGitHubRepos(user.githubHandle, process.env.GITHUB_TOKEN);
          const existingProjects = await prisma.project.findMany({
            where: { userId: user.id },
            select: { repoUrl: true },
          });
          const existingUrls = new Set(existingProjects.map((p) => p.repoUrl));

          let queued = 0;
          let skippedForks = 0;

          for (const repo of repos) {
            const repoUrl = repo.html_url;
            const isExisting = existingUrls.has(repoUrl);
            // Queue if new or updated in last 30 days
            const lastPushed = new Date(repo.pushed_at);
            const shouldQueue = !isExisting || (Date.now() - lastPushed.getTime() < 30 * 24 * 60 * 60 * 1000);

            if (!shouldQueue) continue;

            // Check if it's a dead fork (fork with no unique contributions)
            if (repo.fork) {
              const forkStatus = await checkForkContribution(user.githubHandle!, repo.name, process.env.GITHUB_TOKEN);
              if (!forkStatus.hasContribution) {
                console.log(`[Sync] Skipping dead fork ${repo.name} (0 commits ahead of ${forkStatus.parentFullName})`);
                skippedForks++;
                continue;
              }
            }

            // Check if already queued
            const alreadyQueued = await prisma.projectQueue.findFirst({
              where: { userId: user.id, repoName: repo.name, status: 'pending' },
            });
            if (!alreadyQueued) {
              await prisma.projectQueue.create({
                data: {
                  userId: user.id,
                  repoName: repo.name,
                  repoUrl,
                  status: 'pending',
                },
              });
              queued++;
            }
          }
          console.log(`[Sync] Queued ${queued} projects for ${user.githubHandle} (skipped ${skippedForks} dead forks)`);
        } catch (err) {
          console.warn('[Sync] Project queue failed for', user.githubHandle, err);
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

      // Never let stats regress to 0 if we had data before
      if (leetcodeEasy < prevLeetcodeEasy && prevLeetcodeEasy > 0) {
        console.log(`[Sync] LeetCode returned ${leetcodeEasy} easy but we had ${prevLeetcodeEasy} - keeping previous`);
        leetcodeEasy = prevLeetcodeEasy;
      }
      if (leetcodeMedium < prevLeetcodeMedium && prevLeetcodeMedium > 0) {
        console.log(`[Sync] LeetCode returned ${leetcodeMedium} medium but we had ${prevLeetcodeMedium} - keeping previous`);
        leetcodeMedium = prevLeetcodeMedium;
      }
      if (leetcodeHard < prevLeetcodeHard && prevLeetcodeHard > 0) {
        console.log(`[Sync] LeetCode returned ${leetcodeHard} hard but we had ${prevLeetcodeHard} - keeping previous`);
        leetcodeHard = prevLeetcodeHard;
      }

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

      // Never let stats regress to 0
      if (codeforcesSolved < prevCodeforcesSolved && prevCodeforcesSolved > 0) {
        console.log(`[Sync] Codeforces returned ${codeforcesSolved} solved but we had ${prevCodeforcesSolved} - keeping previous`);
        codeforcesSolved = prevCodeforcesSolved;
      }
      if (codeforcesRating < prevCodeforcesRating && prevCodeforcesRating > 0) {
        console.log(`[Sync] Codeforces rating ${codeforcesRating} < previous ${prevCodeforcesRating} - keeping previous`);
        codeforcesRating = prevCodeforcesRating;
      }

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

      if (hackerrankBadges < prevHackerrankBadges && prevHackerrankBadges > 0) {
        console.log(`[Sync] HackerRank returned ${hackerrankBadges} badges but we had ${prevHackerrankBadges} - keeping previous`);
        hackerrankBadges = prevHackerrankBadges;
      }

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

  // ---------- STREAK MULTIPLIER ----------
  // Calculate current streak BEFORE we save today's activity
  const recentActivities = await prisma.dailyActivity.findMany({
    where: { userId: user.id },
    orderBy: { date: 'desc' },
    take: 60,
  });
  const dateMap = new Map(recentActivities.map((a) => [a.date, a.xpGained]));
  let currentStreak = 0;
  const todayStr = now.toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const checkDate = dateMap.has(todayStr) ? todayStr : dateMap.has(yesterdayStr) ? yesterdayStr : null;
  if (checkDate) {
    const d = new Date(checkDate);
    while (true) {
      const ds = d.toISOString().split('T')[0];
      const xp = dateMap.get(ds);
      if (xp && xp > 0) {
        currentStreak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
  }
  // If today already has activity, streak includes today; otherwise it's up to yesterday
  const streakForMultiplier = dateMap.has(todayStr) ? currentStreak : currentStreak;
  const streakMult = getStreakMultiplier(streakForMultiplier);
  const streakBonusXP = totalDeltaXP > 0 ? Math.round(totalDeltaXP * (streakMult - 1)) : 0;

  // ---------- CALCULATE FINAL XP ----------
  // XP only ever goes UP: current XP + delta + streak bonus. Never regress.
  const finalDeltaXP = totalDeltaXP + streakBonusXP;
  const finalXP = Math.max(user.xp, user.xp + finalDeltaXP);

  // ---------- UPDATE USER ----------
  await prisma.user.update({
    where: { id: user.id },
    data: {
      xp: finalXP,
      totalCommits,
      totalPRs,
      totalReviews,
      reviewComments,
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

  // ---------- MILESTONE BONUSES ----------
  const prevLeetcodeTotal = prevLeetcodeEasy + prevLeetcodeMedium + prevLeetcodeHard;
  const currLeetcodeTotal = leetcodeEasy + leetcodeMedium + leetcodeHard;
  const milestones = calculateMilestoneBonuses(
    {
      commits: prevCommits,
      prs: prevPRs,
      reviews: user.totalReviews,
      leetcodeSolved: prevLeetcodeTotal,
      streakDays: streakForMultiplier - (dateMap.has(todayStr) ? 0 : 1),
    },
    {
      commits: totalCommits,
      prs: totalPRs,
      reviews: totalReviews,
      leetcodeSolved: currLeetcodeTotal,
      streakDays: streakForMultiplier,
    }
  );

  if (milestones.xp > 0) {
    const milestoneXP = milestones.xp;
    await prisma.user.update({
      where: { id: user.id },
      data: { xp: { increment: milestoneXP } },
    });
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        platform: 'SYSTEMICS',
        activityType: 'MILESTONE',
        description: `Milestones: ${milestones.labels.join(', ')}`,
        xpAwarded: milestoneXP,
        externalId: `milestone-${user.id}-${dateSlug}-${Date.now()}`,
        metadata: { labels: milestones.labels, xp: milestoneXP },
      },
    }).catch(() => {});
    console.log(`[Sync] Milestones for ${user.email}: +${milestoneXP} XP (${milestones.labels.join(', ')})`);
  }

  // ---------- STREAK BONUS ACTIVITY ----------
  if (streakBonusXP > 0) {
    activities.push({
      userId: user.id,
      platform: 'SYSTEMICS',
      activityType: 'STREAK_BONUS',
      description: `${streakForMultiplier}-day streak bonus (${streakMult}x)`,
      xpAwarded: streakBonusXP,
      externalId: `streak-bonus-${user.id}-${dateSlug}`,
      metadata: { streakDays: streakForMultiplier, multiplier: streakMult },
    });
  }

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

  // ---------- FETCH COMMIT MESSAGES FOR BADGES ----------
  let commitMessages: string[] = [];
  const isFirstBadgeSync = !user.lastBadgeCommitSync;
  if (user.githubHandle) {
    try {
      const since = isFirstBadgeSync ? undefined : user.lastBadgeCommitSync;
      const maxPages = isFirstBadgeSync ? 10 : 3;
      const commits = await fetchCommitMessages(user.githubHandle, process.env.GITHUB_TOKEN, since, maxPages);
      commitMessages = commits.map((c) => c.message);
      console.log(`[Sync] ${user.email}: fetched ${commitMessages.length} commit messages (${isFirstBadgeSync ? 'bulk' : 'incremental'})`);
    } catch (err) {
      console.warn(`[Sync] Failed to fetch commit messages for ${user.email}:`, err);
    }
  }

  // Update badge commit sync cursor (whether or not badge gen succeeds)
  await prisma.user.update({
    where: { id: user.id },
    data: { lastBadgeCommitSync: now },
  });

  // ---------- DAILY ACTIVITY TRACKING ----------
  if (finalDeltaXP > 0) {
    const dateStr = now.toISOString().split('T')[0];
    const platforms = Array.from(new Set(activities.map((a) => a.platform)));

    await prisma.dailyActivity.upsert({
      where: {
        userId_date: { userId: user.id, date: dateStr },
      },
      update: {
        xpGained: { increment: finalDeltaXP },
        platforms: { push: platforms },
      },
      create: {
        userId: user.id,
        date: dateStr,
        xpGained: finalDeltaXP,
        platforms,
      },
    });

    // Check streak badges
    await checkStreakBadges(user.id);
  }

  // ---------- QUEUE BADGE GENERATION ----------
  if (totalDeltaXP > 0 || isFirstSync || commitMessages.length > 0) {
    await prisma.badgeQueue.create({
      data: {
        userId: user.id,
        commits: commitMessages,
        isFirst: isFirstBadgeSync,
        status: 'pending',
      },
    });
    console.log(`[Sync] Queued badge generation for ${user.email} (${commitMessages.length} commits, first=${isFirstBadgeSync})`);
  }

  console.log(`[Sync] ${user.email}: +${totalDeltaXP} delta XP (commits: +${totalCommits - prevCommits}, PRs processed)`);
}

async function checkStreakBadges(userId: string) {
  const activities = await prisma.dailyActivity.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: 60,
  });

  const dateMap = new Map(activities.map((a) => [a.date, a.xpGained]));

  // Calculate current streak
  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const checkDate = dateMap.has(today) ? today : dateMap.has(yesterday) ? yesterday : null;

  if (checkDate) {
    const d = new Date(checkDate);
    while (true) {
      const dateStr = d.toISOString().split('T')[0];
      const xp = dateMap.get(dateStr);
      if (xp && xp > 0) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
  }

  const existingBadges = await prisma.badge.findMany({
    where: { userId, category: 'streak' },
  });

  const hasBadge = (name: string) => existingBadges.some((b) => b.name === name);

  const streakBadges = [
    { days: 30, name: '30-Day Apotheosis', rarity: 'legendary', color: '#f59e0b', icon: 'Crown' },
    { days: 14, name: '14-Day Inferno', rarity: 'epic', color: '#a855f7', icon: 'Flame' },
    { days: 7, name: '7-Day Flame', rarity: 'rare', color: '#3b82f6', icon: 'Flame' },
    { days: 3, name: '3-Day Spark', rarity: 'common', color: '#6b7280', icon: 'Zap' },
  ];

  for (const sb of streakBadges) {
    if (streak >= sb.days && !hasBadge(sb.name)) {
      await prisma.badge.create({
        data: {
          userId,
          name: sb.name,
          description: `Maintained a ${sb.days}-day activity streak.`,
          rarity: sb.rarity,
          color: sb.color,
          icon: sb.icon,
          category: 'streak',
          generatedBy: 'system',
        },
      });
      break; // Only award the highest tier
    }
  }
}