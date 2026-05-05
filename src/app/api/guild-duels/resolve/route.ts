import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    const activeDuels = await prisma.guildDuel.findMany({
      where: {
        status: 'active',
        resolvedAt: { lte: now },
      },
      include: {
        challengerGuild: { select: { id: true, name: true } },
        opponentGuild: { select: { id: true, name: true } },
      },
    });

    const results = [];

    for (const duel of activeDuels) {
      const [challengerMembers, opponentMembers] = await Promise.all([
        prisma.user.findMany({
          where: { guildId: duel.challengerGuildId },
          select: { id: true, xp: true },
        }),
        prisma.user.findMany({
          where: { guildId: duel.opponentGuildId },
          select: { id: true, xp: true },
        }),
      ]);

      const challengerEndXP = challengerMembers.reduce(
        (sum, m) => sum + (m.xp || 0),
        0
      );
      const opponentEndXP = opponentMembers.reduce(
        (sum, m) => sum + (m.xp || 0),
        0
      );

      const challengerGain = challengerEndXP - duel.challengerStartXP;
      const opponentGain = opponentEndXP - duel.opponentStartXP;

      let winnerGuildId: string | null = null;
      if (challengerGain > opponentGain) {
        winnerGuildId = duel.challengerGuildId;
      } else if (opponentGain > challengerGain) {
        winnerGuildId = duel.opponentGuildId;
      }

      await prisma.guildDuel.update({
        where: { id: duel.id },
        data: {
          status: 'completed',
          winnerGuildId,
          challengerEndXP,
          opponentEndXP,
          resolvedAt: now,
        },
      });

      if (winnerGuildId) {
        const winningGuild =
          winnerGuildId === duel.challengerGuildId
            ? duel.challengerGuild
            : duel.opponentGuild;
        const losingGuild =
          winnerGuildId === duel.challengerGuildId
            ? duel.opponentGuild
            : duel.challengerGuild;
        const winningMembers =
          winnerGuildId === duel.challengerGuildId
            ? challengerMembers
            : opponentMembers;
        const losingMembers =
          winnerGuildId === duel.challengerGuildId
            ? opponentMembers
            : challengerMembers;

        await Promise.all(
          winningMembers.map((member) =>
            prisma.badge.create({
              data: {
                userId: member.id,
                name: 'Guild War Victor',
                description: `Won a guild war for ${winningGuild.name}.`,
                rarity: 'epic',
                color: '#a855f7',
                icon: 'Swords',
                category: 'special',
                generatedBy: 'system',
              },
            })
          )
        );

        await Promise.all(
          winningMembers.map((member) =>
            prisma.inboxMessage.create({
              data: {
                userId: member.id,
                type: 'system',
                title: 'Guild War Won!',
                body: `Your guild ${winningGuild.name} won the guild war against ${losingGuild.name}! You earned the Guild War Victor badge.`,
                metadata: { duelId: duel.id, winnerGuildId },
              },
            })
          )
        );

        await Promise.all(
          losingMembers.map((member) =>
            prisma.inboxMessage.create({
              data: {
                userId: member.id,
                type: 'system',
                title: 'Guild War Complete',
                body: `Your guild ${losingGuild.name} lost the guild war against ${winningGuild.name}. Better luck next time!`,
                metadata: { duelId: duel.id, winnerGuildId },
              },
            })
          )
        );
      }

      results.push({
        duelId: duel.id,
        winnerGuildId,
        challengerGain,
        opponentGain,
      });
    }

    return NextResponse.json({
      success: true,
      resolved: results.length,
      results,
    });
  } catch (error: any) {
    console.error('Guild duel resolve error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
