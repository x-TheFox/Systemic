import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const users = await prisma.user.findMany({
      take: limit,
      orderBy: { xp: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        imageUrl: true,
        githubHandle: true,
        title: true,
        xp: true,
        totalCommits: true,
        totalPRs: true,
        leetcodeEasy: true,
        leetcodeMedium: true,
        leetcodeHard: true,
        codeforcesRating: true,
        codeforcesSolved: true,
        hackerrankBadges: true,
        createdAt: true,
        skillTreeState: {
          select: { currentGrind: true },
        },
        badges: {
          where: { category: 'weekly_leaderboard' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ users: [] });
  }
}
