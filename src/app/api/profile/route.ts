import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

async function getOrCreateUser(clerkId: string, email: string, name: string | null, imageUrl: string | null) {
  return prisma.user.upsert({
    where: { clerkId },
    update: { email, name, imageUrl },
    create: {
      clerkId,
      email,
      name,
      imageUrl,
      skillTreeState: { create: { unlockedNodes: [], currentGrind: null } },
    },
  });
}

const privateUserInclude = {
  activityLogs: { orderBy: { timestamp: 'desc' as const }, take: 50 },
  skillTreeState: true,
  ghostSnapshots: { orderBy: [{ year: 'desc' as const }, { weekNumber: 'desc' as const }], take: 10 },
  badges: { orderBy: { createdAt: 'desc' as const } },
  dynamicNodes: true,
  pastTitles: { orderBy: { createdAt: 'desc' as const }, take: 20 },
};

const publicUserSelect = {
  id: true,
  name: true,
  imageUrl: true,
  githubHandle: true,
  leetcodeHandle: true,
  codeforcesHandle: true,
  hackerrankHandle: true,
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
  badges: { orderBy: { createdAt: 'desc' as const } },
  skillTreeState: true,
  dynamicNodes: true,
  pastTitles: { orderBy: { createdAt: 'desc' as const }, take: 20 },
  guild: {
    include: {
      badges: true,
    },
  },
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get('userId');
    const clerkIdParam = searchParams.get('clerkId');
    const githubHandle = searchParams.get('githubHandle');

    let dbUser;

    if (githubHandle) {
      // Public profile lookup — use public-safe select (no email, no activityLogs, no ghostSnapshots)
      dbUser = await prisma.user.findFirst({
        where: {
          githubHandle: {
            equals: githubHandle,
            mode: 'insensitive',
          },
        },
        select: publicUserSelect,
      });
    } else if (clerkIdParam) {
      dbUser = await prisma.user.findUnique({
        where: { clerkId: clerkIdParam },
        include: privateUserInclude,
      });
    } else if (userIdParam) {
      dbUser = await prisma.user.findUnique({
        where: { id: userIdParam },
        include: privateUserInclude,
      });
    } else {
      const user = await currentUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      dbUser = await getOrCreateUser(
        user.id,
        user.emailAddresses[0]?.emailAddress || `${user.id}@systemics.app`,
        `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
        user.imageUrl
      );

      dbUser = await prisma.user.findUnique({
        where: { id: dbUser.id },
        include: privateUserInclude,
      });
    }

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: dbUser });
  } catch (error: any) {
    console.error('Profile GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { leetcodeHandle, codeforcesHandle, hackerrankHandle, name } = body;

    await getOrCreateUser(
      user.id,
      user.emailAddresses[0]?.emailAddress || `${user.id}@systemics.app`,
      `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
      user.imageUrl
    );

    const updated = await prisma.user.update({
      where: { clerkId: user.id },
      data: {
        ...(leetcodeHandle !== undefined && { leetcodeHandle }),
        ...(codeforcesHandle !== undefined && { codeforcesHandle }),
        ...(hackerrankHandle !== undefined && { hackerrankHandle }),
        ...(name !== undefined && { name }),
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    console.error('Profile PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
