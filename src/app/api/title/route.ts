import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { groqGenerateText } from '@/lib/ai/groq-models';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const userId = body.userId;
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    if (userId === 'all') {
      const users = await prisma.user.findMany({ select: { id: true } });
      let totalTitles = 0;
      for (const user of users) {
        try {
          const count = await generateTitleForUser(user.id);
          totalTitles += count;
          console.log(`[Title] Generated title for user ${user.id}`);
        } catch (err) {
          console.error(`[Title] Failed for user ${user.id}:`, err);
        }
      }
      return NextResponse.json({ success: true, usersProcessed: users.length, totalTitles });
    }

    const count = await generateTitleForUser(userId);
    return NextResponse.json({ success: true, titles: count });
  } catch (error: any) {
    console.error('[Title] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function generateTitleForUser(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      activityLogs: { orderBy: { timestamp: 'desc' }, take: 10 },
      dynamicNodes: { where: { unlocked: true } },
      ghostSnapshots: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  if (!user) return 0;

  const oldTitle = user.title;

  const deepDiveSnapshot = user.ghostSnapshots.find((s: any) => {
    const ac = s.activityCounts as any;
    return ac?.deepDive === true;
  });

  const deepDiveData = deepDiveSnapshot?.activityCounts as any;
  const skillBreakdown = deepDiveSnapshot?.skillBreakdown as Record<string, number> || {};

  const topSkills = Object.entries(skillBreakdown)
    .filter(([, v]) => (v as number) > 0)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 3)
    .map(([k]) => k)
    .join(', ');

  const title = await groqGenerateText(`You are the Title Master of Systemics, a competitive developer guild. You grant short, hype, one-line titles to developers based on their entire profile.

USER: ${user.name || user.email}
GITHUB: ${user.githubHandle || 'none'}
TOTAL XP: ${user.xp}
COMMITS: ${user.totalCommits} | PRs: ${user.totalPRs}
LEETCODE: ${user.leetcodeEasy}E / ${user.leetcodeMedium}M / ${user.leetcodeHard}H
CODEFORCES: Rating ${user.codeforcesRating}
HACKERRANK: ${user.hackerrankBadges} badges
TRYHACKME: ${user.tryhackmePoints}pts | Rank: ${user.tryhackmeRank}
TOP SKILLS: ${topSkills}
ARCHETYPE: ${deepDiveData?.archetype || 'Unknown'}
GRIND PATH: ${deepDiveData?.grindPath || 'Unknown'}
UNLOCKED NODES: ${user.dynamicNodes.map((n: any) => n.name).join(', ')}

RULES:
1. Generate EXACTLY ONE title — a short, hype phrase (2-5 words max)
2. Examples: "Cache Commander", "TypeScript Artisan", "Algo Gladiator", "Pipeline Warlord", "DOM Surgeon"
3. Must reference their actual dominant skill
4. NO generic titles like "Developer" or "Coder"
5. Gaming-style, memorable, slightly exaggerated
6. Just output the title, nothing else — no quotes, no markdown, no explanation`);

  const cleanTitle = title.trim().replace(/^["']|["']$/g, '').replace(/\*\*/g, '').slice(0, 50);

  await prisma.user.update({
    where: { id: user.id },
    data: { title: cleanTitle },
  });

  return 1;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const githubHandle = searchParams.get('githubHandle');

    if (!githubHandle) {
      return NextResponse.json({ error: 'githubHandle required' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { githubHandle },
      select: {
        title: true,
        name: true,
        pastTitles: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    return NextResponse.json({
      title: user?.title || null,
      name: user?.name || null,
      pastTitles: user?.pastTitles || [],
    });
  } catch (error: any) {
    console.error('Title GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}