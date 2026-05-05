import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type ActivityLog = {
  id: string;
  userId: string;
  platform: string;
  activityType: string;
  description: string | null;
  xpAwarded: number;
  metadata: unknown;
  timestamp: Date;
  externalId: string | null;
};

type CategoryName =
  | 'COMMITS'
  | 'PULL_REQUESTS'
  | 'REVIEWS'
  | 'LEETCODE'
  | 'CODEFORCES'
  | 'HACKERRANK'
  | 'STREAK_BONUSES'
  | 'MILESTONES'
  | 'PROJECTS'
  | 'OTHER';

interface CategoryItem {
  description: string | null;
  xpAwarded: number;
  timestamp: string;
  metadata: unknown;
}

interface Category {
  name: CategoryName;
  totalXP: number;
  items: CategoryItem[];
  count: number;
}

function getCategoryName(log: ActivityLog): CategoryName {
  if (log.platform === 'GITHUB' && log.activityType === 'COMMIT') return 'COMMITS';
  if (log.platform === 'GITHUB' && log.activityType === 'PR') return 'PULL_REQUESTS';
  if (log.platform === 'GITHUB' && log.activityType === 'REVIEW') return 'REVIEWS';
  if (log.platform === 'LEETCODE') return 'LEETCODE';
  if (log.platform === 'CODEFORCES') return 'CODEFORCES';
  if (log.platform === 'HACKERRANK') return 'HACKERRANK';
  if (log.platform === 'SYSTEMICS' && log.activityType === 'STREAK_BONUS') return 'STREAK_BONUSES';
  if (log.platform === 'SYSTEMICS' && log.activityType === 'MILESTONE') return 'MILESTONES';
  if (log.platform === 'GITHUB' && log.activityType === 'PROJECT') return 'PROJECTS';
  return 'OTHER';
}

function buildCategories(logs: ActivityLog[]): Category[] {
  const buckets: Record<CategoryName, CategoryItem[]> = {
    COMMITS: [],
    PULL_REQUESTS: [],
    REVIEWS: [],
    LEETCODE: [],
    CODEFORCES: [],
    HACKERRANK: [],
    STREAK_BONUSES: [],
    MILESTONES: [],
    PROJECTS: [],
    OTHER: [],
  };

  for (const log of logs) {
    const category = getCategoryName(log);
    buckets[category].push({
      description: log.description,
      xpAwarded: log.xpAwarded,
      timestamp: log.timestamp.toISOString(),
      metadata: log.metadata,
    });
  }

  const categoryOrder: CategoryName[] = [
    'COMMITS',
    'PULL_REQUESTS',
    'REVIEWS',
    'LEETCODE',
    'CODEFORCES',
    'HACKERRANK',
    'STREAK_BONUSES',
    'MILESTONES',
    'PROJECTS',
    'OTHER',
  ];

  return categoryOrder.map((name) => {
    const items = buckets[name];
    const totalXP = items.reduce((sum, item) => sum + item.xpAwarded, 0);
    return { name, totalXP, items, count: items.length };
  }).filter((c) => c.count > 0);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId query param is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const activityLogs = await prisma.activityLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
    });

    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: [{ pinned: 'desc' }, { stars: 'desc' }],
      select: {
        name: true,
        xpValue: true,
        rarity: true,
        description: true,
        repoUrl: true,
      },
    });

    const categories = buildCategories(activityLogs);
    const totalXP = categories.reduce((sum, cat) => sum + cat.totalXP, 0);
    const projectsTotalXP = projects.reduce((sum, p) => sum + p.xpValue, 0);
    // Use user's actual XP as grand total — activityLogs don't capture everything (node unlocks, etc)
    const userXP = (await prisma.user.findUnique({ where: { id: userId }, select: { xp: true } }))?.xp ?? 0;

    return NextResponse.json({
      totalXP,
      categories,
      projects,
      projectsTotalXP,
      userXP,
    });
  } catch (error: any) {
    console.error('XP breakdown GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
