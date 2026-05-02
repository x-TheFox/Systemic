import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateWeeklyPostMortem } from '@/lib/ai/groq';
import { triggerMilestone } from '@/lib/pusher/server';

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

    const logs = await prisma.activityLog.findMany({
      where: { timestamp: { gte: oneWeekAgo } },
      include: { user: true },
      orderBy: { timestamp: 'desc' },
    });

    // Aggregate by user
    const userStats: Record<string, {
      name: string;
      email: string;
      xpGained: number;
      activities: number;
      platforms: Set<string>;
    }> = {};

    for (const log of logs) {
      const uid = log.userId;
      if (!userStats[uid]) {
        userStats[uid] = {
          name: log.user.name || log.user.email,
          email: log.user.email,
          xpGained: 0,
          activities: 0,
          platforms: new Set(),
        };
      }
      userStats[uid].xpGained += log.xpAwarded;
      userStats[uid].activities += 1;
      userStats[uid].platforms.add(log.platform);
    }

    const sortedUsers = Object.entries(userStats).sort((a, b) => b[1].xpGained - a[1].xpGained);
    const mvp = sortedUsers[0];
    const lurker = sortedUsers[sortedUsers.length - 1];
    const totalXP = sortedUsers.reduce((sum, [, s]) => sum + s.xpGained, 0);

    const rankings = sortedUsers.map(([id, stats]) => ({
      id,
      name: stats.name,
      xp: stats.xpGained,
      activities: stats.activities,
      platforms: Array.from(stats.platforms),
    }));

    const activityData = JSON.stringify({
      week: now.toISOString(),
      totalParticipants: sortedUsers.length,
      totalXP,
      mvp: mvp ? { name: mvp[1].name, xp: mvp[1].xpGained } : null,
      lurker: lurker ? { name: lurker[1].name, xp: lurker[1].xpGained } : null,
      rankings,
    });

    const postMortem = await generateWeeklyPostMortem(activityData);

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
      message: `Weekly Post-Mortem is live! MVP: ${mvp?.[1].name || 'N/A'}`,
      metadata: { type: 'weekly-report' },
    });

    // Optionally send to Discord
    if (process.env.DISCORD_WEBHOOK_URL) {
      try {
        await fetch(process.env.DISCORD_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `## Systemics Weekly Post-Mortem\n\n${postMortem.slice(0, 1900)}`,
          }),
        });
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