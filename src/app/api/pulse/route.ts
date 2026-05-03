import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '0') || 500;

    const activityLogs = await prisma.activityLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    const badges = await prisma.badge.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    const unlockedNodes = await prisma.dynamicSkillNode.findMany({
      where: { unlocked: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    const duels = await prisma.duel.findMany({
      where: { status: 'completed' },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        challenger: { select: { id: true, name: true, email: true, githubHandle: true } },
        opponent: { select: { id: true, name: true, email: true, githubHandle: true } },
      },
    });

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
      ...badges.map((badge) => ({
        id: `badge-${badge.id}`,
        type: 'badge-earned',
        message: `${badge.user?.name || badge.user?.email || 'Someone'} earned the ${badge.rarity} badge: ${badge.name}`,
        timestamp: badge.createdAt.toISOString(),
        userName: badge.user?.name || badge.user?.email?.split('@')[0],
        xp: 0,
        rarity: badge.rarity,
      })),
      ...unlockedNodes.map((node) => ({
        id: `node-${node.id}`,
        type: 'node-unlocked',
        message: `${node.user?.name || node.user?.email || 'Someone'} unlocked ${node.name}!`,
        timestamp: node.createdAt.toISOString(),
        userName: node.user?.name || node.user?.email?.split('@')[0],
        xp: node.xpReward,
      })),
      ...duels.map((duel) => {
        const winner = duel.winnerId === duel.challengerId ? duel.challenger : duel.opponent;
        const loser = duel.winnerId === duel.challengerId ? duel.opponent : duel.challenger;
        return {
          id: `duel-${duel.id}`,
          type: 'duel-won',
          message: `${winner?.name || winner?.githubHandle || 'Someone'} won a duel against ${loser?.name || loser?.githubHandle || 'someone'}!`,
          timestamp: duel.updatedAt.toISOString(),
          userName: winner?.name || winner?.githubHandle,
          xp: 0,
        };
      }),
    ];

    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({ events });
  } catch (error: any) {
    console.error('Pulse GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}