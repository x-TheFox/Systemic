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
      return NextResponse.json({ error: 'Sync not configured' }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/sync?userId=${user.id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return NextResponse.json({ error: body.error || 'Sync failed' }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Sync-self error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
