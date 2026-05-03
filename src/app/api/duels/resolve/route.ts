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

    // Find active duels that have passed their 7-day window
    const activeDuels = await prisma.duel.findMany({
      where: {
        status: 'active',
        resolvedAt: { lte: now },
      },
      include: {
        challenger: { select: { id: true, xp: true, name: true, email: true, githubHandle: true, imageUrl: true } },
        opponent: { select: { id: true, xp: true, name: true, email: true, githubHandle: true, imageUrl: true } },
      },
    });

    const results = [];

    for (const duel of activeDuels) {
      const challengerXP = duel.challenger.xp - duel.challengerStartXP;
      const opponentXP = duel.opponent.xp - duel.opponentStartXP;
      const winnerId = challengerXP > opponentXP ? duel.challengerId :
                       opponentXP > challengerXP ? duel.opponentId : null;

      await prisma.duel.update({
        where: { id: duel.id },
        data: {
          status: 'completed',
          winnerId,
          challengerEndXP: duel.challenger.xp,
          opponentEndXP: duel.opponent.xp,
        },
      });

      if (winnerId) {
        const xpGap = Math.abs(challengerXP - opponentXP);
        const isUnderdog = (winnerId === duel.challengerId && duel.challengerStartXP < duel.opponentStartXP) ||
                           (winnerId === duel.opponentId && duel.opponentStartXP < duel.challengerStartXP);

        let badgeName = 'Duel Victor';
        let badgeRarity = 'rare';
        let badgeColor = '#3b82f6';

        if (isUnderdog) {
          badgeName = 'Underdog Upset';
          badgeRarity = 'epic';
          badgeColor = '#a855f7';
        } else if (xpGap >= 500) {
          badgeName = 'Dominant Display';
          badgeRarity = 'legendary';
          badgeColor = '#f59e0b';
        }

        await prisma.badge.create({
          data: {
            userId: winnerId,
            name: badgeName,
            description: `Won a 1v1 weekly duel${xpGap >= 500 ? ' by 500+ XP' : isUnderdog ? ' as the underdog' : ''}.`,
            rarity: badgeRarity,
            color: badgeColor,
            icon: 'Swords',
            category: 'special',
            generatedBy: 'system',
          },
        });

        // Participation badge for loser
        const loserId = winnerId === duel.challengerId ? duel.opponentId : duel.challengerId;
        await prisma.badge.create({
          data: {
            userId: loserId,
            name: 'Duelist',
            description: 'Participated in a 1v1 weekly duel.',
            rarity: 'common',
            color: '#6b7280',
            icon: 'Swords',
            category: 'special',
            generatedBy: 'system',
          },
        });

        // Notify winner
        await prisma.inboxMessage.create({
          data: {
            userId: winnerId,
            type: 'system',
            title: 'Duel Won!',
            body: `You won your duel! ${xpGap >= 500 ? 'Dominant victory!' : isUnderdog ? 'Underdog upset!' : 'Well fought!'} You earned the ${badgeName} badge.`,
            metadata: { duelId: duel.id, badgeName, xpGap },
          },
        });

        // Notify loser
        await prisma.inboxMessage.create({
          data: {
            userId: loserId,
            type: 'system',
            title: 'Duel Complete',
            body: `Your duel has ended. You earned the Duelist badge for participating.`,
            metadata: { duelId: duel.id },
          },
        });
      }

      results.push({ duelId: duel.id, winnerId, challengerXP, opponentXP });
    }

    return NextResponse.json({ success: true, resolved: results.length, results });
  } catch (error: any) {
    console.error('Duel resolve error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
