import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await currentUser();
    let currentUserId: string | null = null;

    if (user) {
      const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
        select: { id: true },
      });
      currentUserId = dbUser?.id ?? null;
    }

    const duels = await prisma.duel.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        challenger: { select: { id: true, name: true, email: true, githubHandle: true, imageUrl: true, xp: true } },
        opponent: { select: { id: true, name: true, email: true, githubHandle: true, imageUrl: true, xp: true } },
      },
    });

    return NextResponse.json({ duels, currentUserId });
  } catch (error: any) {
    console.error('Duels GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
