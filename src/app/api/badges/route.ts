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

  // Rarity rubric based on absolute stats — the AI must calibrate rarity to actual achievement
  const totalStats = user.totalCommits + user.totalPRs * 5 + user.leetcodeHard * 10 + user.leetcodeMedium * 5 + user.codeforcesSolved;
  let rarityGuidance = '';
  if (totalStats >= 400) {
    rarityGuidance = `This user is ELITE-TIER (total score ${totalStats}). MOST badges should be LEGENDARY or EPIC. Only give COMMON for the most trivial/basic skills. Legendary should dominate (~40-50% of badges), Epic next (~30%), Rare for solid but not exceptional work (~15%), Common only for beginner/foundation-level stuff (~5%).`;
  } else if (totalStats >= 150) {
    rarityGuidance = `This user is VETERAN-TIER (total score ${totalStats}). Badges should skew EPIC and RARE. Legendary only for their absolute best work (~10%). Epic for mastery (~30%). Rare for notable achievements (~35%). Common for basic skills/foundations (~25%).`;
  } else if (totalStats >= 50) {
    rarityGuidance = `This user is MID-TIER (total score ${totalStats}). MOST badges should be COMMON and RARE. Legendary ONLY if they did something truly exceptional (~2-3 max). Epic only for clear mastery moments (~10%). Rare for solid work (~30%). Common for everything else (~55-60%).`;
  } else {
    rarityGuidance = `This user is BEGINNER-TIER (total score ${totalStats}). ALMOST ALL badges must be COMMON. Rare ONLY for genuinely notable moments (~10% max). Epic/Legendary are FORBIDDEN unless they did something truly insane — and even then, cap at 1 epic max. Do NOT inflate rarity.`;
  }

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

RARITY RUBRIC — THIS IS CRITICAL. Rarity must reflect ACTUAL achievement level, not be spread evenly:
${rarityGuidance}

ABSOLUTE RARITY DEFINITIONS:
- LEGENDARY (#f59e0b gold): Once-in-a-gang feats. Major systems built, 100+ commit projects shipped, architectural decisions that changed everything, mastery that few possess. NEVER give legendary for basic work.
- EPIC (#a855f7 purple): Clear mastery in a domain. Complex features shipped, deep expertise demonstrated, significant impact. Not for "wrote some code" — for "wrote code that mattered."
- RARE (#3b82f6 blue): Notable achievements. Solid contributions, good problem solving, above-average work. The "they know their stuff" tier.
- COMMON (#6b7280 gray): Basic skill recognition. Any real work gets common, but it's still an achievement. Foundation-level, first steps, minor contributions.

RULES:
1. Generate as many badges as warranted — NO LIMIT. Look at every commit message and create a badge for significant work, patterns, or skills shown.
2. Each badge must be UNIQUE — do NOT repeat existing badge names listed above.
3. Descriptions MUST reference specific commit messages, patterns, or actual work done — tie each badge to real evidence.
4. Names must be HYPE and GAMING-STYLE (e.g., "Cache Commander", "DOM Dominator", "Pipeline Warlord").
5. RARITY MUST FOLLOW THE RUBRIC ABOVE. Do NOT spread rarities evenly. A beginner does NOT get legendary badges. An elite user does NOT get flooded with common badges.
6. Colors: common=#6b7280 gray, rare=#3b82f6 blue, epic=#a855f7 purple, legendary=#f59e0b gold
7. Icons: pick simple lucide-react icon names (e.g., "Zap", "Shield", "Cpu", "Flame", "Target", "Code", "Database", "Globe")
8. Categories: skill | grind | social | special
9. If there are no meaningful commits to badge, generate 0 badges.

OUTPUT FORMAT (exactly this format, no markdown code blocks — repeat for every badge):
BADGE 1
name: <name>
description: <description>
rarity: <common|rare|epic|legendary>
color: <hex>
icon: <icon>
category: <category>

BADGE 2
name: <name>
description: <description>
rarity: <common|rare|epic|legendary>
color: <hex>
icon: <icon>
category: <category>

...and so on for every badge you want to forge. There is NO maximum.`;

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