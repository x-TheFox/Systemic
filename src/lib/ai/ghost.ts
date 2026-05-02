import { prisma } from '@/lib/prisma';

export interface GhostSnapshotData {
  weekNumber: number;
  year: number;
  totalXP: number;
  skillBreakdown: Record<string, number>;
  createdAt: string;
}

export async function createWeeklySnapshot(userId: string): Promise<void> {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
  );

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { activityLogs: true },
  });

  if (!user) return;

  const skillBreakdown: Record<string, number> = {
    Frontend: 0,
    Backend: 0,
    DevOps: 0,
    Architecture: 0,
    Algo: 0,
  };

  user.activityLogs.forEach((log) => {
    const meta = log.metadata as Record<string, any> | null;
    const category = meta?.category || 'Algo';
    if (skillBreakdown[category] !== undefined) {
      skillBreakdown[category] += log.xpAwarded;
    }
  });

  await prisma.ghostSnapshot.upsert({
    where: {
      userId_weekNumber_year: {
        userId,
        weekNumber,
        year: now.getFullYear(),
      },
    },
    update: {
      totalXP: user.xp,
      skillBreakdown,
      activityCounts: {
        GITHUB: { commits: user.totalCommits, prs: user.totalPRs },
        LEETCODE: { easy: user.leetcodeEasy, medium: user.leetcodeMedium, hard: user.leetcodeHard },
        CODEFORCES: { rating: user.codeforcesRating, solved: user.codeforcesSolved },
        HACKERRANK: { badges: user.hackerrankBadges },
      },
    },
    create: {
      userId,
      weekNumber,
      year: now.getFullYear(),
      totalXP: user.xp,
      skillBreakdown,
      activityCounts: {
        GITHUB: { commits: user.totalCommits, prs: user.totalPRs },
        LEETCODE: { easy: user.leetcodeEasy, medium: user.leetcodeMedium, hard: user.leetcodeHard },
        CODEFORCES: { rating: user.codeforcesRating, solved: user.codeforcesSolved },
        HACKERRANK: { badges: user.hackerrankBadges },
      },
    },
  });
}

export async function getGhostSnapshots(userId: string): Promise<GhostSnapshotData[]> {
  const snapshots = await prisma.ghostSnapshot.findMany({
    where: { userId },
    orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
  });

  return snapshots.map((s) => ({
    weekNumber: s.weekNumber,
    year: s.year,
    totalXP: s.totalXP,
    skillBreakdown: s.skillBreakdown as Record<string, number>,
    createdAt: s.createdAt.toISOString(),
  }));
}

export async function getGhostSnapshotForWeek(
  userId: string,
  weekNumber: number,
  year: number
): Promise<GhostSnapshotData | null> {
  const snapshot = await prisma.ghostSnapshot.findUnique({
    where: { userId_weekNumber_year: { userId, weekNumber, year } },
  });

  if (!snapshot) return null;

  return {
    weekNumber: snapshot.weekNumber,
    year: snapshot.year,
    totalXP: snapshot.totalXP,
    skillBreakdown: snapshot.skillBreakdown as Record<string, number>,
    createdAt: snapshot.createdAt.toISOString(),
  };
}
