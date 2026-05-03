import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const handle = searchParams.get('handle');

    if (!handle) {
      return NextResponse.json({ error: 'handle required' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { githubHandle: handle },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get last 365 days of activity
    const activities = await prisma.dailyActivity.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
      take: 365,
    });

    // Calculate streak
    const dateMap = new Map(activities.map((a) => [a.date, a.xpGained]));
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Check if streak is active (today or yesterday has activity)
    const checkDate = dateMap.has(today) ? today : dateMap.has(yesterday) ? yesterday : null;

    if (checkDate) {
      const d = new Date(checkDate);
      while (true) {
        const dateStr = d.toISOString().split('T')[0];
        const xp = dateMap.get(dateStr);
        if (xp && xp > 0) {
          streak++;
          d.setDate(d.getDate() - 1);
        } else {
          break;
        }
      }
    }

    return NextResponse.json({
      streak,
      activities: activities.map((a) => ({
        date: a.date,
        xpGained: a.xpGained,
        platforms: a.platforms,
      })),
    });
  } catch (error: any) {
    console.error('Streaks GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
