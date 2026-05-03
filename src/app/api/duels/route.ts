import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
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

    const duels = await prisma.duel.findMany({
      where: {
        OR: [
          { challengerId: dbUser.id },
          { opponentId: dbUser.id },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        challenger: { select: { id: true, name: true, email: true, githubHandle: true, imageUrl: true, xp: true } },
        opponent: { select: { id: true, name: true, email: true, githubHandle: true, imageUrl: true, xp: true } },
      },
    });

    return NextResponse.json({ duels });
  } catch (error: any) {
    console.error('Duels GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
