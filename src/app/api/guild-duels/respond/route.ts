import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { duelId, action } = body;

    if (!duelId || !action || !['accept', 'decline'].includes(action)) {
      return NextResponse.json(
        { error: 'duelId and valid action required' },
        { status: 400 }
      );
    }

    const duel = await prisma.guildDuel.findFirst({
      where: {
        id: duelId,
        status: 'pending',
      },
      include: {
        challengerGuild: { select: { id: true, name: true, adminId: true } },
        opponentGuild: { select: { id: true, name: true, adminId: true } },
      },
    });

    if (!duel) {
      return NextResponse.json(
        { error: 'Duel not found or already resolved' },
        { status: 404 }
      );
    }

    if (duel.opponentGuild.adminId !== dbUser.id) {
      return NextResponse.json(
        { error: 'Only opponent guild admin can respond' },
        { status: 403 }
      );
    }

    if (action === 'accept') {
      const [challengerMembers, opponentMembers] = await Promise.all([
        prisma.user.findMany({
          where: { guildId: duel.challengerGuildId },
          select: { xp: true },
        }),
        prisma.user.findMany({
          where: { guildId: duel.opponentGuildId },
          select: { xp: true },
        }),
      ]);

      const challengerStartXP = challengerMembers.reduce(
        (sum, m) => sum + (m.xp || 0),
        0
      );
      const opponentStartXP = opponentMembers.reduce(
        (sum, m) => sum + (m.xp || 0),
        0
      );

      const now = new Date();
      const resolvedAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      await prisma.guildDuel.update({
        where: { id: duelId },
        data: {
          status: 'active',
          challengerStartXP,
          opponentStartXP,
          resolvedAt,
        },
      });

      await prisma.activityLog.create({
        data: {
          userId: dbUser.id,
          platform: 'SYSTEM',
          activityType: 'GUILD_DUEL_ACCEPTED',
          description: `${duel.opponentGuild.name} accepted a guild war challenge from ${duel.challengerGuild.name}`,
          xpAwarded: 0,
          metadata: { duelId, action: 'accept' },
        },
      });

      await prisma.inboxMessage.create({
        data: {
          userId: duel.challengerGuild.adminId,
          type: 'system',
          title: 'Guild War Accepted!',
          body: `${duel.opponentGuild.name} has accepted your guild war challenge. May the best guild win!`,
          metadata: { duelId },
        },
      });

      return NextResponse.json({ success: true, status: 'active', resolvedAt });
    }

    await prisma.guildDuel.update({
      where: { id: duelId },
      data: { status: 'declined' },
    });

    await prisma.activityLog.create({
      data: {
        userId: dbUser.id,
        platform: 'SYSTEM',
        activityType: 'GUILD_DUEL_DECLINED',
        description: `${duel.opponentGuild.name} declined a guild war challenge from ${duel.challengerGuild.name}`,
        xpAwarded: 0,
        metadata: { duelId, action: 'decline' },
      },
    });

    await prisma.inboxMessage.create({
      data: {
        userId: duel.challengerGuild.adminId,
        type: 'system',
        title: 'Guild War Declined',
        body: `${duel.opponentGuild.name} declined your guild war challenge.`,
        metadata: { duelId },
      },
    });

    return NextResponse.json({ success: true, status: 'declined' });
  } catch (error: any) {
    console.error('Guild duel respond error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
