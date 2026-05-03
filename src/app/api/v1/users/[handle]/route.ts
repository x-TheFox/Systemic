import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const handle = searchParams.get('handle');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    if (!handle) {
      return NextResponse.json({ error: 'handle required' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { githubHandle: handle },
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
      rank: null, // Could compute if needed
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
