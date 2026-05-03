import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateWeeklyPostMortem } from '@/lib/ai/groq';
import { triggerMilestone } from '@/lib/pusher/server';
import { sendDiscordWebhook } from '@/lib/discord';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
    const year = now.getFullYear();
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // ---------- TRUE WEEKLY XP: Compare current XP to last week's snapshot ----------
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        imageUrl: true,
        xp: true,
        totalCommits: true,
        totalPRs: true,
        leetcodeEasy: true,
        leetcodeMedium: true,
        leetcodeHard: true,
        codeforcesRating: true,
        codeforcesSolved: true,
        hackerrankBadges: true,
        tryhackmePoints: true,
        tryhackmeRank: true,
        tryhackmeBadges: true,
        tryhackmeRooms: true,
      },
    });

    // Get last week's snapshots for delta calculation
    const prevWeekSnapshots = await prisma.ghostSnapshot.findMany({
      where: {
        weekNumber: weekNumber - 1,
        year,
      },
    });
    const prevWeekXPMap = new Map(prevWeekSnapshots.map((s) => [s.userId, s.totalXP]));

    // Also get this week's activity logs for platform breakdown
    const weeklyLogs = await prisma.activityLog.findMany({
      where: { timestamp: { gte: oneWeekAgo } },
      include: { user: true },
      orderBy: { timestamp: 'desc' },
    });

    // Aggregate by user
    const userStats: Record<string, {
      name: string;
      email: string;
      currentXP: number;
      prevXP: number;
      xpGained: number;
      activities: number;
      platforms: Set<string>;
      commits: number;
      prs: number;
      leetcodeSolved: number;
      codeforcesSolved: number;
    }> = {};

    for (const user of allUsers) {
      const prevXP = prevWeekXPMap.get(user.id) || 0;
      const xpGained = Math.max(0, user.xp - prevXP);

      userStats[user.id] = {
        name: user.name || user.email,
        email: user.email,
        currentXP: user.xp,
        prevXP,
        xpGained,
        activities: 0,
        platforms: new Set(),
        commits: 0,
        prs: 0,
        leetcodeSolved: 0,
        codeforcesSolved: 0,
      };
    }

    // Count weekly activities per platform
    for (const log of weeklyLogs) {
      const uid = log.userId;
      if (!userStats[uid]) continue;

      userStats[uid].activities += 1;
      userStats[uid].platforms.add(log.platform);

      if (log.platform === 'GITHUB' && log.activityType === 'COMMIT') {
        const meta = log.metadata as any;
        userStats[uid].commits += meta?.deltaCommits || 0;
      }
      if (log.platform === 'GITHUB' && log.activityType === 'PR') {
        userStats[uid].prs += 1;
      }
      if (log.platform === 'LEETCODE') {
        const meta = log.metadata as any;
        const delta = meta?.delta || {};
        userStats[uid].leetcodeSolved += (delta.easy || 0) + (delta.medium || 0) + (delta.hard || 0);
      }
      if (log.platform === 'CODEFORCES') {
        const meta = log.metadata as any;
        userStats[uid].codeforcesSolved += meta?.deltaSolved || 0;
      }
    }

    // Filter out users with 0 XP gained this week
    const activeUsers = Object.entries(userStats).filter(([, s]) => s.xpGained > 0);
    const sortedUsers = activeUsers.sort((a, b) => b[1].xpGained - a[1].xpGained);

    const mvp = sortedUsers[0];
    const lurker = sortedUsers.length > 1 ? sortedUsers[sortedUsers.length - 1] : null;
    const totalXP = sortedUsers.reduce((sum, [, s]) => sum + s.xpGained, 0);

    const rankings = sortedUsers.map(([id, stats]) => ({
      id,
      name: stats.name,
      xp: stats.xpGained,
      currentXP: stats.currentXP,
      activities: stats.activities,
      platforms: Array.from(stats.platforms),
      commits: stats.commits,
      prs: stats.prs,
      leetcodeSolved: stats.leetcodeSolved,
      codeforcesSolved: stats.codeforcesSolved,
    }));

    const activityData = JSON.stringify({
      week: now.toISOString(),
      totalParticipants: sortedUsers.length,
      totalXP,
      mvp: mvp ? { name: mvp[1].name, xp: mvp[1].xpGained, currentXP: mvp[1].currentXP } : null,
      lurker: lurker ? { name: lurker[1].name, xp: lurker[1].xpGained, currentXP: lurker[1].currentXP } : null,
      rankings,
    });

    const postMortem = await generateWeeklyPostMortem(activityData);

// Award weekly leaderboard badges to top 3 + bottom 2
    // Avoid giving a user both a top badge and a bottom badge
    await prisma.badge.deleteMany({ where: { category: 'weekly_leaderboard' } });

    const awardedUserIds = new Set<string>();
    const weeklyBadges = [];

    // Top badges
    if (sortedUsers.length > 0) {
      const [mvpId] = sortedUsers[0];
      awardedUserIds.add(mvpId);
      weeklyBadges.push(
        prisma.badge.create({
          data: {
            userId: mvpId,
            name: 'The Honored One',
            description: `Crowned as the #1 grinder of Week ${weekNumber}. Absolute unit.`,
            rarity: 'legendary',
            color: '#f59e0b',
            icon: 'svg:mvp',
            category: 'weekly_leaderboard',
            generatedBy: 'weekly',
          },
        })
      );
    }
    if (sortedUsers.length > 1) {
      const [secondId] = sortedUsers[1];
      awardedUserIds.add(secondId);
      weeklyBadges.push(
        prisma.badge.create({
          data: {
            userId: secondId,
            name: 'Silver Runner',
            description: `Claimed 2nd place in Week ${weekNumber}. So close to glory.`,
            rarity: 'epic',
            color: '#a855f7',
            icon: 'svg:2nd',
            category: 'weekly_leaderboard',
            generatedBy: 'weekly',
          },
        })
      );
    }
    if (sortedUsers.length > 2) {
      const [thirdId] = sortedUsers[2];
      awardedUserIds.add(thirdId);
      weeklyBadges.push(
        prisma.badge.create({
          data: {
            userId: thirdId,
            name: 'Bronze Challenger',
            description: `Secured 3rd place in Week ${weekNumber}. Rising star.`,
            rarity: 'rare',
            color: '#3b82f6',
            icon: 'svg:3rd',
            category: 'weekly_leaderboard',
            generatedBy: 'weekly',
          },
        })
      );
    }

    // Bottom badges (only if at least 4 users so no overlap with top 3)
    if (sortedUsers.length >= 4) {
      const [last2Id] = sortedUsers[sortedUsers.length - 2];
      if (!awardedUserIds.has(last2Id)) {
        weeklyBadges.push(
          prisma.badge.create({
            data: {
              userId: last2Id,
              name: 'The Penultimate',
              description: `Second to last in Week ${weekNumber}. The shadows remember you.`,
              rarity: 'common',
              color: '#6b7280',
              icon: 'svg:last2',
              category: 'weekly_leaderboard',
              generatedBy: 'weekly',
            },
          })
        );
      }
      const [last1Id] = sortedUsers[sortedUsers.length - 1];
      if (!awardedUserIds.has(last1Id)) {
        weeklyBadges.push(
          prisma.badge.create({
            data: {
              userId: last1Id,
              name: 'The Lurker',
              description: `Last place in Week ${weekNumber}. The ghost watches from below.`,
              rarity: 'common',
              color: '#6b7280',
              icon: 'svg:last1',
              category: 'weekly_leaderboard',
              generatedBy: 'weekly',
            },
          })
        );
      }
    }

    if (weeklyBadges.length > 0) {
      await Promise.all(weeklyBadges);
    }

    // Upsert into WeeklyReport
    await prisma.weeklyReport.upsert({
      where: { weekNumber_year: { weekNumber, year } },
      update: {
        content: postMortem,
        mvpName: mvp?.[1].name || null,
        mvpUserId: mvp?.[0] || null,
        mvpXp: mvp?.[1].xpGained || 0,
        lurkerName: lurker?.[1].name || null,
        lurkerUserId: lurker?.[0] || null,
        lurkerXp: lurker?.[1].xpGained || 0,
        totalXP,
        participants: sortedUsers.length,
        rankings: rankings as any,
        published: true,
      },
      create: {
        weekNumber,
        year,
        content: postMortem,
        mvpName: mvp?.[1].name || null,
        mvpUserId: mvp?.[0] || null,
        mvpXp: mvp?.[1].xpGained || 0,
        lurkerName: lurker?.[1].name || null,
        lurkerUserId: lurker?.[0] || null,
        lurkerXp: lurker?.[1].xpGained || 0,
        totalXP,
        participants: sortedUsers.length,
        rankings: rankings as any,
        published: true,
      },
    });

    // Trigger Pusher event
    await triggerMilestone('new-activity', {
      userId: 'system',
      message: `Weekly Post-Mortem is live! MVP: ${mvp?.[1].name || 'N/A'} (+${mvp?.[1].xpGained || 0} XP)`,
      metadata: { type: 'weekly-report' },
    });

    // Optionally send to Discord
    if (process.env.DISCORD_WEBHOOK_URL) {
      try {
        await sendDiscordWebhook(process.env.DISCORD_WEBHOOK_URL, postMortem);
      } catch (e) {
        console.error('Discord webhook failed:', e);
      }
    }

    return NextResponse.json({ success: true, postMortem, rankings });
  } catch (error: any) {
    console.error('Weekly report error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    const reports = await prisma.weeklyReport.findMany({
      where: { published: true },
      orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
      take: limit,
    });

    return NextResponse.json({ reports });
  } catch (error: any) {
    console.error('Weekly GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}