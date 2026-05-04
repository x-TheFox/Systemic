import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;
    const limit = Math.min(
      parseInt(new URL(_req.url).searchParams.get('limit') || '50'),
      100
    );

    const user = await prisma.user.findFirst({
      where: {
        githubHandle: {
          equals: handle,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        githubHandle: true,
        title: true,
        xp: true,
        totalCommits: true,
        totalPRs: true,
        totalReviews: true,
        leetcodeEasy: true,
        leetcodeMedium: true,
        leetcodeHard: true,
        codeforcesRating: true,
        codeforcesSolved: true,
        hackerrankBadges: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const badges = await prisma.badge.findMany({
      where: { userId: user.id },
      orderBy: [
        { rarity: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });

    return NextResponse.json({
      handle: user.githubHandle,
      name: user.name,
      title: user.title,
      xp: user.xp,
      rank: null,
      stats: {
        commits: user.totalCommits,
        prs: user.totalPRs,
        reviews: user.totalReviews,
        leetcodeEasy: user.leetcodeEasy,
        leetcodeMedium: user.leetcodeMedium,
        leetcodeHard: user.leetcodeHard,
        codeforcesRating: user.codeforcesRating,
        codeforcesSolved: user.codeforcesSolved,
        hackerrankBadges: user.hackerrankBadges,
      },
      badges,
    });
  } catch (error: any) {
    console.error('Public stats GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
