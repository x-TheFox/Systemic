import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const secret = process.env.CRON_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'Deep dive not configured' }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/deepdive`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: user.id }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return NextResponse.json({ error: body.error || 'Deep dive failed' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, archetype: data.archetype });
  } catch (error: any) {
    console.error('Deepdive-self error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
