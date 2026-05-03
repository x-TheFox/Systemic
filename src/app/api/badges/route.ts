import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateBadgesForUser } from '@/lib/ai/badges';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const userId = body.userId;
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const commits: string[] = body.commits || [];
    const isFirstBadgeSync: boolean = body.isFirstBadgeSync || false;

    if (userId === 'all') {
      const users = await prisma.user.findMany({ select: { id: true } });
      let totalBadges = 0;
      for (const user of users) {
        try {
          const count = await generateBadgesForUser(user.id);
          totalBadges += count;
          console.log(`[Badges] Generated ${count} badges for user ${user.id}`);
        } catch (err) {
          console.error(`[Badges] Failed for user ${user.id}:`, err);
        }
      }
      return NextResponse.json({ success: true, usersProcessed: users.length, totalBadges });
    }

    const count = await generateBadgesForUser(userId, commits, isFirstBadgeSync);
    return NextResponse.json({ success: true, badges: count });
  } catch (error: any) {
    console.error('[Badges] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const clerkId = searchParams.get('clerkId');
    const githubHandle = searchParams.get('githubHandle');

    let dbUserId = userId;
    if (clerkId) {
      const user = await prisma.user.findUnique({ where: { clerkId } });
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      dbUserId = user.id;
    } else if (githubHandle) {
      const user = await prisma.user.findFirst({ where: { githubHandle } });
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      dbUserId = user.id;
    }

    if (!dbUserId) {
      return NextResponse.json({ error: 'userId, clerkId, or githubHandle required' }, { status: 400 });
    }

    const badges = await prisma.badge.findMany({
      where: { userId: dbUserId },
      orderBy: [
        { rarity: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({ badges });
  } catch (error: any) {
    console.error('Badges GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
