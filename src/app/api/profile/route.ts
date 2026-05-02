import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';

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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get('userId');
    const clerkIdParam = searchParams.get('clerkId');

    let dbUser;

    if (clerkIdParam) {
      dbUser = await prisma.user.findUnique({
        where: { clerkId: clerkIdParam },
        include: {
          activityLogs: { orderBy: { timestamp: 'desc' }, take: 50 },
          skillTreeState: true,
          achievements: { orderBy: { earnedAt: 'desc' } },
          ghostSnapshots: { orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }], take: 10 },
        },
      });
    } else if (userIdParam) {
      dbUser = await prisma.user.findUnique({
        where: { id: userIdParam },
        include: {
          activityLogs: { orderBy: { timestamp: 'desc' }, take: 50 },
          skillTreeState: true,
          achievements: { orderBy: { earnedAt: 'desc' } },
          ghostSnapshots: { orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }], take: 10 },
        },
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
        include: {
          activityLogs: { orderBy: { timestamp: 'desc' }, take: 50 },
          skillTreeState: true,
          achievements: { orderBy: { earnedAt: 'desc' } },
          ghostSnapshots: { orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }], take: 10 },
        },
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
    const { githubHandle, leetcodeHandle, codeforcesHandle, hackerrankHandle, name } = body;

    await getOrCreateUser(
      user.id,
      user.emailAddresses[0]?.emailAddress || `${user.id}@systemics.app`,
      `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
      user.imageUrl
    );

    const updated = await prisma.user.update({
      where: { clerkId: user.id },
      data: {
        ...(githubHandle !== undefined && { githubHandle }),
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