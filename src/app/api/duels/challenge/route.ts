import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';
import { generateBadgesForUser } from '@/lib/ai/badges';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    
    let userId: string | null = null;
    
    if (!isCron) {
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
      userId = dbUser.id;
    }

    const body = await req.json();
    const { opponentHandle } = body;

    if (!opponentHandle) {
      return NextResponse.json({ error: 'opponentHandle required' }, { status: 400 });
    }

    const challenger = await prisma.user.findUnique({
      where: userId ? { id: userId } : { clerkId: (await currentUser())!.id },
    });

    const opponent = await prisma.user.findFirst({
      where: { githubHandle: opponentHandle },
    });

    if (!challenger || !opponent) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (challenger.id === opponent.id) {
      return NextResponse.json({ error: 'Cannot challenge yourself' }, { status: 400 });
    }

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
    const year = now.getFullYear();

    // Check for existing pending/active duel between these users this week
    const existing = await prisma.duel.findFirst({
      where: {
        weekNumber,
        year,
        OR: [
          { challengerId: challenger.id, opponentId: opponent.id },
          { challengerId: opponent.id, opponentId: challenger.id },
        ],
        status: { in: ['pending', 'active'] },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Duel already exists for this week' }, { status: 409 });
    }

    const duel = await prisma.duel.create({
      data: {
        challengerId: challenger.id,
        opponentId: opponent.id,
        weekNumber,
        year,
        status: 'pending',
      },
    });

    // Send inbox message to opponent
    await prisma.inboxMessage.create({
      data: {
        userId: opponent.id,
        type: 'duel_request',
        title: 'Duel Challenge!',
        body: `${challenger.name || challenger.email} has challenged you to a 1v1 weekly duel.`,
        metadata: { duelId: duel.id, challengerId: challenger.id, opponentId: opponent.id },
      },
    });

    return NextResponse.json({ success: true, duel });
  } catch (error: any) {
    console.error('Duel challenge error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
