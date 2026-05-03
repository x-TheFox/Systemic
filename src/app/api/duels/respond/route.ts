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
    const { duelId, action } = body; // action: 'accept' | 'decline'

    if (!duelId || !action) {
      return NextResponse.json({ error: 'duelId and action required' }, { status: 400 });
    }

    const duel = await prisma.duel.findFirst({
      where: {
        id: duelId,
        opponentId: dbUser.id,
        status: 'pending',
      },
    });

    if (!duel) {
      return NextResponse.json({ error: 'Duel not found or already resolved' }, { status: 404 });
    }

    if (action === 'accept') {
      // Snapshot current XP for both players
      const [challenger, opponent] = await Promise.all([
        prisma.user.findUnique({ where: { id: duel.challengerId }, select: { xp: true } }),
        prisma.user.findUnique({ where: { id: duel.opponentId }, select: { xp: true } }),
      ]);

      const now = new Date();
      const resolvedAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      await prisma.duel.update({
        where: { id: duelId },
        data: {
          status: 'active',
          challengerStartXP: challenger?.xp ?? 0,
          opponentStartXP: opponent?.xp ?? 0,
          resolvedAt,
        },
      });

      // Notify challenger
      await prisma.inboxMessage.create({
        data: {
          userId: duel.challengerId,
          type: 'duel_accepted',
          title: 'Duel Accepted!',
          body: 'Your duel challenge has been accepted. May the best grinder win!',
          metadata: { duelId },
        },
      });

      return NextResponse.json({ success: true, status: 'active', resolvedAt });
    } else {
      await prisma.duel.update({
        where: { id: duelId },
        data: { status: 'declined' },
      });

      // Notify challenger
      await prisma.inboxMessage.create({
        data: {
          userId: duel.challengerId,
          type: 'duel_declined',
          title: 'Duel Declined',
          body: 'Your duel challenge was declined.',
          metadata: { duelId },
        },
      });

      return NextResponse.json({ success: true, status: 'declined' });
    }
  } catch (error: any) {
    console.error('Duel respond error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
