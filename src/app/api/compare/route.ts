import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const handle1 = searchParams.get('h1');
    const handle2 = searchParams.get('h2');

    if (!handle1 || !handle2) {
      return NextResponse.json({ error: 'h1 and h2 required' }, { status: 400 });
    }

    const user1 = await prisma.user.findFirst({
      where: { githubHandle: handle1 },
      include: {
        badges: true,
        skillTreeState: true,
      },
    });

    const user2 = await prisma.user.findFirst({
      where: { githubHandle: handle2 },
      include: {
        badges: true,
        skillTreeState: true,
      },
    });

    if (!user1 || !user2) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find common badges
    const badgeNames1 = new Set(user1.badges.map((b) => b.name));
    const commonBadges = user2.badges.filter((b) => badgeNames1.has(b.name));

    return NextResponse.json({
      user1: {
        id: user1.id,
        name: user1.name,
        email: user1.email,
        imageUrl: user1.imageUrl,
        githubHandle: user1.githubHandle,
        title: user1.title,
        xp: user1.xp,
        totalCommits: user1.totalCommits,
        totalPRs: user1.totalPRs,
        leetcodeHard: user1.leetcodeHard,
        codeforcesRating: user1.codeforcesRating,
        hackerrankBadges: user1.hackerrankBadges,
        badges: user1.badges,
        skillTreeState: user1.skillTreeState,
      },
      user2: {
        id: user2.id,
        name: user2.name,
        email: user2.email,
        imageUrl: user2.imageUrl,
        githubHandle: user2.githubHandle,
        title: user2.title,
        xp: user2.xp,
        totalCommits: user2.totalCommits,
        totalPRs: user2.totalPRs,
        leetcodeHard: user2.leetcodeHard,
        codeforcesRating: user2.codeforcesRating,
        hackerrankBadges: user2.hackerrankBadges,
        badges: user2.badges,
        skillTreeState: user2.skillTreeState,
      },
      commonBadges,
    });
  } catch (error: any) {
    console.error('Compare GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
