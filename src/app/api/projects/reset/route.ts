import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/projects/reset
 * Wipes all analyzed projects and resets commit sync cursors so everything
 * gets re-evaluated with the new LLM weighting + project XP system.
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Delete all existing projects
    const deletedProjects = await prisma.project.deleteMany({});
    console.log(`[ProjectReset] Deleted ${deletedProjects.count} projects`);

    // 2. Reset commit sync cursor for ALL users so commits get re-fetched + re-scored
    const resetUsers = await prisma.user.updateMany({
      data: { lastBadgeCommitSync: null },
    });
    console.log(`[ProjectReset] Reset lastBadgeCommitSync for ${resetUsers.count} users`);

    // 3. Clear any stuck project queue items
    const clearedQueue = await prisma.projectQueue.deleteMany({
      where: { status: { in: ['pending', 'failed'] } },
    });
    console.log(`[ProjectReset] Cleared ${clearedQueue.count} pending/failed queue items`);

    return NextResponse.json({
      success: true,
      deletedProjects: deletedProjects.count,
      resetUsers: resetUsers.count,
      clearedQueue: clearedQueue.count,
      message: 'All projects wiped and commit sync cursors reset. Next sync will re-evaluate everything with LLM weighting.',
    });
  } catch (error: any) {
    console.error('[ProjectReset] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
