import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateBadgesForUser } from '@/lib/ai/badges';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pendingQueues = await prisma.badgeQueue.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
    });

    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const queue of pendingQueues) {
      try {
        await prisma.badgeQueue.update({
          where: { id: queue.id },
          data: { status: 'processing' },
        });

        const count = await generateBadgesForUser(queue.userId, queue.commits, queue.isFirst);

        await prisma.badgeQueue.update({
          where: { id: queue.id },
          data: { status: 'done' },
        });

        processed++;
        console.log(`[BadgeQueue] Processed ${queue.id} for user ${queue.userId}: ${count} badges`);
      } catch (err: any) {
        failed++;
        const msg = err.message || String(err);
        errors.push(`${queue.userId}: ${msg}`);
        await prisma.badgeQueue.update({
          where: { id: queue.id },
          data: { status: 'failed', error: msg.slice(0, 500) },
        });
        console.error(`[BadgeQueue] Failed ${queue.id} for user ${queue.userId}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      pending: pendingQueues.length,
      processed,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('[BadgeQueue] Process error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pending = await prisma.badgeQueue.count({ where: { status: 'pending' } });
    const processing = await prisma.badgeQueue.count({ where: { status: 'processing' } });
    const done = await prisma.badgeQueue.count({ where: { status: 'done' } });
    const failed = await prisma.badgeQueue.count({ where: { status: 'failed' } });

    return NextResponse.json({ pending, processing, done, failed });
  } catch (error: any) {
    console.error('[BadgeQueue] Stats error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
