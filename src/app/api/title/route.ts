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
      badges: { orderBy: { createdAt: 'desc' }, take: 20 },
      duelsAsChallenger: { where: { status: 'completed' } },
      duelsAsOpponent: { where: { status: 'completed' } },
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
    .slice(0, 5)
    .map(([k, v]) => `${k}:${v}`)
    .join(', ');

  // Build badge context
  const badgeList = user.badges.map((b: any) => {
    const rarityEmoji = b.rarity === 'legendary' ? '🔥' : b.rarity === 'epic' ? '💎' : b.rarity === 'rare' ? '⭐' : '⚡';
    return `${rarityEmoji} ${b.name} (${b.rarity})`;
  }).join(' | ');

  const badgeCategories = user.badges.reduce((acc: Record<string, number>, b: any) => {
    acc[b.category] = (acc[b.category] || 0) + 1;
    return acc;
  }, {});
  const badgeCategorySummary = Object.entries(badgeCategories)
    .map(([cat, count]) => `${cat}:${count}`)
    .join(', ');

  const totalDuels = user.duelsAsChallenger.length + user.duelsAsOpponent.length;
  const duelWins = user.duelsAsChallenger.filter((d: any) => d.winnerId === user.id).length
    + user.duelsAsOpponent.filter((d: any) => d.winnerId === user.id).length;

  // Recent activity summary
  const recentPlatforms = Array.from(new Set(user.activityLogs.map((l: any) => l.platform))).join(', ');
  const recentTypes = Array.from(new Set(user.activityLogs.map((l: any) => l.activityType))).join(', ');

  const prompt = `You are the Grand Title Forger of Systemics - an elite, hyper-creative AI that bestows LEGENDARY one-line titles upon developers. Your titles are spoken in hushed tones across the guild. They are iconic. They are meme-worthy. They are earned.

## CANDIDATE PROFILE

**Name:** ${user.name || 'Unknown'}
**GitHub:** @${user.githubHandle || 'none'}
**Display Identity:** ${user.name || user.githubHandle || user.email}

**Power Stats:**
- Total XP: ${user.xp.toLocaleString()}
- Commits: ${user.totalCommits.toLocaleString()}
- PRs Merged: ${user.totalPRs}
- Code Reviews: ${user.totalReviews}
- LeetCode: ${user.leetcodeEasy}E / ${user.leetcodeMedium}M / ${user.leetcodeHard}H
- Codeforces Rating: ${user.codeforcesRating || 'N/A'}
- HackerRank Badges: ${user.hackerrankBadges}

**Dominant Skills:** ${topSkills || 'Unknown'}
**Archetype:** ${deepDiveData?.archetype || 'Unknown'}
**Grind Path:** ${deepDiveData?.grindPath || 'Unknown'}

**Battle Record:**
- Duels Fought: ${totalDuels}
- Duels Won: ${duelWins}

**Unlocked Skill Nodes:** ${user.dynamicNodes.map((n: any) => n.name).join(', ') || 'None yet'}

**Badge Collection (${user.badges.length} total):**
${badgeList || 'No badges yet'}

**Badge Breakdown:** ${badgeCategorySummary || 'none'}

**Recent Activity:** ${recentPlatforms || 'None'} - ${recentTypes || 'None'}

## TITLE FORGING RULES

1. Generate EXACTLY ONE title - maximum 6 words, ideally 2-4
2. The title must feel EARNED, not given. It should reflect their actual dominance.
3. Use their badges, skill nodes, archetype, and GitHub handle as creative fuel.
4. Reference their name or handle ONLY if it makes the title significantly cooler (e.g., "The Fox's Gambit" for x-TheFox)
5. Gaming/mythology/anime/military/Dark Souls naming conventions are ENCOURAGED
6. ALLITERATION and RHYME are powerful tools
7. NO generic garbage like "Developer", "Coder", "Programmer", "Engineer"
8. NO quotes, markdown, or explanation - output ONLY the raw title text

## TITLE EXAMPLES (quality bar)

- "Cachebreaker Prime"
- "The Nullpointer Slayer"
- "TypeScript Thundergod"
- "Pipeline Warlord"
- "DOM Surgeon Supreme"
- "Async Await Ronin"
- "The LeetCode Leviathan"
- "Git Reaper"
- "Binary Berserker"
- "Stack Overflow Sovereign"
- "The Commit Crusader"
- "API Archon"
- "The Fox's Grand Gambit"
- "Docker Demon Lord"
- "Recursion Raider"
- "Runtime Reaper"
- "Syntax Samurai"
- "The Merge Conflicter"
- "Segmentation Fault Slayer"
- "Build Breaker Extraordinaire"

Now forge their title:`;

  const rawTitle = await groqGenerateText(prompt);

  // Aggressive cleanup
  let cleanTitle = rawTitle
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\*\*/g, '')
    .replace(/^[-–-]\s*/, '')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50);

  // Fallback if model returns garbage
  if (!cleanTitle || cleanTitle.length < 2 || cleanTitle.toLowerCase().includes('title')) {
    cleanTitle = oldTitle || 'Unnamed Grunt';
  }

  // Archive old title only if it actually changed
  if (oldTitle && oldTitle !== cleanTitle) {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);

    await prisma.pastTitle.create({
      data: {
        userId: user.id,
        title: oldTitle,
        weekNumber,
        year: now.getFullYear(),
      },
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { title: cleanTitle },
  });

  console.log(`[Title] "${cleanTitle}" forged for ${user.name || user.githubHandle || user.email}`);
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
      where: { githubHandle: { mode: 'insensitive', equals: githubHandle.toLowerCase() } },
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
