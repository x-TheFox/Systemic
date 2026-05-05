import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface DedupeResult {
  usersAffected: number;
  duplicatesRemoved: number;
  totalXPDeducted: number;
}

export async function POST(req: Request): Promise<NextResponse<DedupeResult | { error: string }>> {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const allProjects = await prisma.project.findMany({
      select: {
        id: true,
        userId: true,
        repoUrl: true,
        name: true,
        xpValue: true,
        createdAt: true,
      },
    });

    const groupedByUserRepo = new Map<string, typeof allProjects>();
    for (const project of allProjects) {
      const key = `${project.userId}:${project.repoUrl}`;
      const group = groupedByUserRepo.get(key) ?? [];
      group.push(project);
      groupedByUserRepo.set(key, group);
    }

    const affectedUserIds = new Set<string>();
    let duplicatesRemoved = 0;
    let totalXPDeducted = 0;

    for (const projects of groupedByUserRepo.values()) {
      if (projects.length <= 1) continue;

      const sorted = [...projects].sort((a, b) => {
        if (b.xpValue !== a.xpValue) return b.xpValue - a.xpValue;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      const [best, ...duplicates] = sorted;
      const userId = best.userId;

      let userXPDeducted = 0;

      await prisma.$transaction(async (tx) => {
        for (const duplicate of duplicates) {
          userXPDeducted += duplicate.xpValue;

          const match = duplicate.repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
          const repoName = match ? match[2] : duplicate.name;

          const logsToDelete = await tx.activityLog.findMany({
            where: {
              userId,
              activityType: 'PROJECT',
              metadata: {
                path: ['repoName'],
                equals: repoName,
              },
            },
            select: { id: true },
          });

          if (logsToDelete.length > 0) {
            await tx.activityLog.deleteMany({
              where: {
                id: { in: logsToDelete.map((log) => log.id) },
              },
            });
          }

          await tx.project.delete({
            where: { id: duplicate.id },
          });
        }

        const remainingLogs = await tx.activityLog.findMany({
          where: { userId },
          select: { xpAwarded: true },
        });

        const recalculatedXP = remainingLogs.reduce((sum, log) => sum + log.xpAwarded, 0);

        await tx.user.update({
          where: { id: userId },
          data: { xp: recalculatedXP },
        });
      });

      affectedUserIds.add(userId);
      duplicatesRemoved += duplicates.length;
      totalXPDeducted += userXPDeducted;
    }

    return NextResponse.json({
      usersAffected: affectedUserIds.size,
      duplicatesRemoved,
      totalXPDeducted,
    });
  } catch (error: any) {
    console.error('[ProjectDedupe] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
