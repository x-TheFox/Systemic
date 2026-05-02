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

    const activityData = JSON.stringify({
      week: new Date().toISOString(),
      totalParticipants: sortedUsers.length,
      totalXP: sortedUsers.reduce((sum, [, s]) => sum + s.xpGained, 0),
      mvp: mvp ? { name: mvp[1].name, xp: mvp[1].xpGained } : null,
      lurker: lurker ? { name: lurker[1].name, xp: lurker[1].xpGained } : null,
      rankings: sortedUsers.map(([id, stats]) => ({
        id,
        name: stats.name,
        xp: stats.xpGained,
        activities: stats.activities,
        platforms: Array.from(stats.platforms),
      })),
    });

    const postMortem = await generateWeeklyPostMortem(activityData);

    // Store in database
    await prisma.activityLog.create({
      data: {
        userId: mvp?.[0] || 'system',
        platform: 'SYSTEM',
        activityType: 'CONTEST',
        description: 'Weekly Post-Mortem',
        xpAwarded: 0,
        metadata: { type: 'weekly-report', content: postMortem, week: new Date().toISOString() },
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

    return NextResponse.json({ success: true, postMortem, rankings: sortedUsers.map(([id, s]) => ({ id, ...s })) });
  } catch (error: any) {
    console.error('Weekly report error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
