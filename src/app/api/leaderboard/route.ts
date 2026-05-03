import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type') || 'players';

    if (type === 'guilds') {
      const guilds = await prisma.guild.findMany({
        where: { isPublic: true },
        include: {
          members: {
            select: { id: true, xp: true, name: true, githubHandle: true, imageUrl: true },
          },
          admin: {
            select: { id: true, name: true, githubHandle: true, imageUrl: true },
          },
          _count: { select: { members: true } },
        },
      });

      const guildsWithStats = guilds
        .map((g) => ({
          id: g.id,
          name: g.name,
          slug: g.slug,
          description: g.description,
          iconUrl: g.iconUrl,
          memberCount: g._count.members,
          totalXP: g.members.reduce((s, m) => s + m.xp, 0),
          admin: g.admin,
          topMember: g.members.sort((a, b) => b.xp - a.xp)[0] || null,
        }))
        .sort((a, b) => b.totalXP - a.totalXP)
        .slice(0, limit);

      return NextResponse.json({ guilds: guildsWithStats });
    }

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
    return NextResponse.json({ users: [], guilds: [] });
  }
}
