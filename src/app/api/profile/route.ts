import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';

export async function GET(_req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
      include: {
        activityLogs: {
          orderBy: { timestamp: 'desc' },
          take: 50,
        },
        skillTreeState: true,
        achievements: {
          orderBy: { earnedAt: 'desc' },
        },
        ghostSnapshots: {
          orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
          take: 10,
        },
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: dbUser });
  } catch (error: any) {
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
