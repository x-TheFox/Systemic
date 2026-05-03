import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const handle = searchParams.get('handle');

    if (!handle) {
      return NextResponse.json({ error: 'handle required' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        githubHandle: {
          equals: handle,
          mode: 'insensitive',
        },
      },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: [{ pinned: 'desc' }, { stars: 'desc' }],
    });

    return NextResponse.json({ projects });
  } catch (error: any) {
    console.error('Projects GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { projectId, pinned } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    }

    // Ensure max 3 pinned
    if (pinned) {
      const pinnedCount = await prisma.project.count({
        where: { userId: dbUser.id, pinned: true },
      });
      if (pinnedCount >= 3) {
        return NextResponse.json({ error: 'Max 3 pinned projects' }, { status: 409 });
      }
    }

    await prisma.project.updateMany({
      where: { id: projectId, userId: dbUser.id },
      data: { pinned: pinned ?? false },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Projects PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
