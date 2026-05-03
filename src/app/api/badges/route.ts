import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { groqGenerateText } from '@/lib/ai/groq-models';

export const dynamic = 'force-dynamic';

async function generateBadgesForUser(userId: string, commits?: string[], isFirstBadgeSync?: boolean): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      badges: true,
      activityLogs: { orderBy: { timestamp: 'desc' }, take: 20 },
      dynamicNodes: { where: { unlocked: true } },
      ghostSnapshots: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  if (!user) return 0;

  const deepDiveSnapshot = user.ghostSnapshots.find((s: any) => {
    const ac = s.activityCounts as any;
    return ac?.deepDive === true;
  });

  const deepDiveData = deepDiveSnapshot?.activityCounts as any;
  const skillBreakdown = deepDiveSnapshot?.skillBreakdown as Record<string, number> || {};

  const topSkills = Object.entries(skillBreakdown)
    .filter(([, v]) => (v as number) > 0)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

  const recentActivity = user.activityLogs
    .slice(0, 10)
    .map((l: any) => `[${l.platform}] ${l.activityType}: ${l.description || ''} (+${l.xpAwarded} XP)`)
    .join('\n');

  const unlockedNodes = user.dynamicNodes.map((n: any) => `${n.name} (${n.path})`).join(', ');

  const existingBadgeNames = user.badges
    .filter((b: any) => b.generatedBy === 'ai')
    .map((b: any) => b.name);

  const existingBadgeText = existingBadgeNames.length > 0
    ? `\nEXISTING BADGES (DO NOT repeat these — generate NEW unique badges):\n${existingBadgeNames.map((n: string) => `- ${n}`).join('\n')}`
    : '';

  const hasCommits = commits && commits.length > 0;
  const commitSection = hasCommits
    ? `\nCOMMIT MESSAGES (${isFirstBadgeSync ? 'ALL HISTORICAL' : 'NEW ONLY'}):\n${commits!.slice(0, 50).map((c, i) => `${i + 1}. ${c}`).join('\n')}`
    : '';

  const isBulk = isFirstBadgeSync && hasCommits;
  const badgeCount = isBulk ? 8 : 4;
  const badgeCountRule = isBulk
    ? `1. Generate ${badgeCount} badges — this is the INITIAL bulk generation covering the developer's entire commit history. Create badges that represent diverse skills shown in their commits.`
    : `1. Generate EXACTLY ${badgeCount} badges — no more, no less`;
  const commitRule = hasCommits
    ? `${isBulk ? '2' : '2'}. Descriptions MUST reference specific commit messages or patterns from the commit list above — tie each badge to actual work done`
    : `${isBulk ? '2' : '2'}. Descriptions must reference ACTUAL repos, languages, or stats — no generic fluff`;

  const prompt = `You are the Badge Smith of Systemics, a competitive developer guild. You forge UNIQUE, HYPED, RARE badges for developers based on their entire skill profile.

USER: ${user.name || user.email}
GITHUB: ${user.githubHandle || 'none'}
TOTAL XP: ${user.xp}
COMMITS: ${user.totalCommits} | PRs: ${user.totalPRs}
LEETCODE: ${user.leetcodeEasy}E / ${user.leetcodeMedium}M / ${user.leetcodeHard}H
CODEFORCES: Rating ${user.codeforcesRating} | Solved: ${user.codeforcesSolved}
HACKERRANK: ${user.hackerrankBadges} badges
TRYHACKME: ${user.tryhackmePoints}pts | Rank: ${user.tryhackmeRank} | ${user.tryhackmeBadges} badges | ${user.tryhackmeRooms} rooms
${existingBadgeText}
${commitSection}

SKILL SIGNALS:
${topSkills}

RECENT ACTIVITY:
${recentActivity}

UNLOCKED NODES:
${unlockedNodes}

DEEP DIVE ARCHETYPE: ${deepDiveData?.archetype || 'Unknown'}
GRIND PATH: ${deepDiveData?.grindPath || 'Unknown'}

RULES:
${badgeCountRule}
${isBulk ? '' : '2. Each badge must be UNIQUE to this developer — do NOT repeat existing badge names'}
${commitRule}
${isBulk ? '4' : '3'}. Names must be HYPE and GAMING-STYLE (e.g., "Cache Commander", "DOM Dominator", "Pipeline Warlord")
${isBulk ? '5' : '4'}. Rarity distribution: ${isBulk ? '2 common, 2 rare, 2 epic, 2 legendary' : '1 common, 1 rare, 1 epic, 1 legendary'}
${isBulk ? '6' : '5'}. Common = basic skill recognition, Rare = notable achievement, Epic = mastery, Legendary = once-in-a-gang feat
${isBulk ? '7' : '6'}. Colors: common=#6b7280 gray, rare=#3b82f6 blue, epic=#a855f7 purple, legendary=#f59e0b gold
${isBulk ? '8' : '7'}. Icons: pick simple lucide-react icon names (e.g., "Zap", "Shield", "Cpu", "Flame", "Target", "Code", "Database", "Globe")
${isBulk ? '9' : '8'}. Categories: skill | grind | social | special

OUTPUT FORMAT (exactly this format, no markdown code blocks):
${Array.from({ length: badgeCount }, (_, i) => {
  const rarities = isBulk ? ['common', 'common', 'rare', 'rare', 'epic', 'epic', 'legendary', 'legendary'] : ['common', 'rare', 'epic', 'legendary'];
  const colors = isBulk ? ['#6b7280', '#6b7280', '#3b82f6', '#3b82f6', '#a855f7', '#a855f7', '#f59e0b', '#f59e0b'] : ['#6b7280', '#3b82f6', '#a855f7', '#f59e0b'];
  return `BADGE ${i + 1}
name: <name>
description: <description>
rarity: ${rarities[i]}
color: ${colors[i]}
icon: <icon>
category: <category>`;
}).join('\n\n')}`;

  const badgeText = await groqGenerateText(prompt);

  const badges = parseBadges(badgeText);

  const newBadges = badges.filter(
    (b: any) => !existingBadgeNames.some((existing: string) => existing.toLowerCase() === b.name.toLowerCase())
  );

  for (const badge of newBadges) {
    await prisma.badge.create({
      data: {
        userId: user.id,
        name: badge.name,
        description: badge.description,
        rarity: badge.rarity,
        color: badge.color,
        icon: badge.icon,
        category: badge.category,
        generatedBy: 'ai',
      },
    });
  }

  return newBadges.length;
}

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

    const commits: string[] = body.commits || [];
    const isFirstBadgeSync: boolean = body.isFirstBadgeSync || false;

    if (userId === 'all') {
      const users = await prisma.user.findMany({ select: { id: true } });
      let totalBadges = 0;
      for (const user of users) {
        try {
          const count = await generateBadgesForUser(user.id);
          totalBadges += count;
          console.log(`[Badges] Generated ${count} badges for user ${user.id}`);
        } catch (err) {
          console.error(`[Badges] Failed for user ${user.id}:`, err);
        }
      }
      return NextResponse.json({ success: true, usersProcessed: users.length, totalBadges });
    }

    const count = await generateBadgesForUser(userId, commits, isFirstBadgeSync);
    return NextResponse.json({ success: true, badges: count });
  } catch (error: any) {
    console.error('[Badges] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function parseBadges(text: string) {
  const badges: any[] = [];
  const sections = text.split(/BADGE \d+/).filter(Boolean);

  for (const section of sections) {
    const lines = section.split('\n').map(l => l.trim()).filter(Boolean);
    const badge: any = {};
    for (const line of lines) {
      const [key, ...rest] = line.split(':');
      if (key && rest.length > 0) {
        badge[key.trim().toLowerCase()] = rest.join(':').trim();
      }
    }
    if (badge.name) badges.push(badge);
  }

  return badges;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const clerkId = searchParams.get('clerkId');
    const githubHandle = searchParams.get('githubHandle');

    let dbUserId = userId;
    if (clerkId) {
      const user = await prisma.user.findUnique({ where: { clerkId } });
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      dbUserId = user.id;
    } else if (githubHandle) {
      const user = await prisma.user.findFirst({ where: { githubHandle } });
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      dbUserId = user.id;
    }

    if (!dbUserId) {
      return NextResponse.json({ error: 'userId, clerkId, or githubHandle required' }, { status: 400 });
    }

    const badges = await prisma.badge.findMany({
      where: { userId: dbUserId },
      orderBy: [
        { rarity: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({ badges });
  } catch (error: any) {
    console.error('Badges GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}