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

    const today = new Date().toISOString().split('T')[0];

    const challenge = await prisma.dailyChallenge.findFirst({
      where: { userId: dbUser.id, date: today },
    });

    return NextResponse.json({ challenge });
  } catch (error: any) {
    console.error('Daily challenge GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
