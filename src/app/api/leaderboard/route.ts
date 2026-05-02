import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const platform = searchParams.get('platform');

    const where = platform ? { platform } : {};

    const users = await prisma.user.findMany({
      take: limit,
      orderBy: { xp: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        imageUrl: true,
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
          select: {
            currentGrind: true,
          },
        },
      },
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
