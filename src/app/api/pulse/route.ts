import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    // Fetch recent activity logs
    const activityLogs = await prisma.activityLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    // Fetch recent achievements
    const achievements = await prisma.achievement.findMany({
      orderBy: { earnedAt: 'desc' },
      take: limit,
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    // Fetch recently unlocked nodes (order by createdAt since DynamicSkillNode has no updatedAt)
    const unlockedNodes = await prisma.dynamicSkillNode.findMany({
      where: { unlocked: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    // Merge and sort by time
    const events = [
      ...activityLogs.map((log) => ({
        id: `log-${log.id}`,
        type: 'new-activity',
        message: `${log.user?.name || log.user?.email || 'Someone'} ${log.description || log.activityType} (+${log.xpAwarded} XP)`,
        timestamp: log.timestamp.toISOString(),
        userName: log.user?.name || log.user?.email?.split('@')[0],
        xp: log.xpAwarded,
        platform: log.platform,
      })),
      ...achievements.map((ach) => ({
        id: `ach-${ach.id}`,
        type: 'achievement-earned',
        message: `${ach.user?.name || ach.user?.email || 'Someone'} earned: ${ach.title}`,
        timestamp: ach.earnedAt.toISOString(),
        userName: ach.user?.name || ach.user?.email?.split('@')[0],
        xp: ach.xpBonus,
      })),
      ...unlockedNodes.map((node) => ({
        id: `node-${node.id}`,
        type: 'node-unlocked',
        message: `${node.user?.name || node.user?.email || 'Someone'} unlocked ${node.name}!`,
        timestamp: node.createdAt.toISOString(),
        userName: node.user?.name || node.user?.email?.split('@')[0],
        xp: node.xpReward,
      })),
    ];

    // Sort by timestamp desc and limit
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({ events: events.slice(0, limit) });
  } catch (error: any) {
    console.error('Pulse GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}