import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
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

    const messages = await prisma.inboxMessage.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.inboxMessage.count({
      where: { userId: dbUser.id, read: false },
    });

    return NextResponse.json({ messages, unreadCount });
  } catch (error: any) {
    console.error('Inbox GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, type, title, body: messageBody, metadata } = body;

    if (!userId || !type || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const message = await prisma.inboxMessage.create({
      data: {
        userId,
        type,
        title,
        body: messageBody || '',
        metadata: metadata || {},
      },
    });

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    console.error('Inbox POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
