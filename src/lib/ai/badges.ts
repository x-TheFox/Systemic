import { prisma } from '@/lib/prisma';
import { groqGenerateText } from './groq-models';
import { triggerMilestone } from '@/lib/pusher/server';

function computeScore(u: any) {
  return (u.totalCommits || 0) + (u.totalPRs || 0) * 5 + (u.leetcodeHard || 0) * 10 + (u.leetcodeMedium || 0) * 5 + (u.codeforcesSolved || 0) + (u.hackerrankBadges || 0) * 2 + (u.tryhackmePoints || 0) / 50;
}

export async function generateBadgesForUser(userId: string, commits?: string[], isFirstBadgeSync?: boolean): Promise<number> {
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

  // Compute relative standing in the guild
  const allUsers = await prisma.user.findMany({
    select: { id: true, totalCommits: true, totalPRs: true, leetcodeHard: true, leetcodeMedium: true, codeforcesSolved: true, hackerrankBadges: true, tryhackmePoints: true, xp: true },
  });
  const scores = allUsers.map(u => ({ id: u.id, score: computeScore(u), xp: u.xp }));
  scores.sort((a, b) => b.score - a.score);
  const rank = scores.findIndex(s => s.id === userId) + 1;
  const percentile = Math.round(((scores.length - rank) / Math.max(scores.length - 1, 1)) * 100);
  const userScore = computeScore(user);
  const maxScore = scores[0]?.score || 1;
  const relativePower = Math.round((userScore / maxScore) * 100);

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

  // Dynamic rarity guidance based on relative guild standing
  let rarityGuidance = '';
  if (percentile >= 90) {
    rarityGuidance = `This user is TOP-TIER in the guild — Rank #${rank} of ${scores.length} (top ${100 - percentile}%). Relative power: ${relativePower}% of the strongest member. They should be DROWNING in LEGENDARY and EPIC badges. Legendary should be ~40-50% of badges, Epic ~30%, Rare ~15%, Common only for the most basic foundations (~5%). This is a guild leader — their badges must reflect dominance.`;
  } else if (percentile >= 70) {
    rarityGuidance = `This user is HIGH-TIER in the guild — Rank #${rank} of ${scores.length} (top ${100 - percentile}%). Relative power: ${relativePower}%. They should get plenty of EPIC and RARE, with some LEGENDARY for their absolute best work (~10-15%). Epic ~30%, Rare ~35%, Common ~20%.`;
  } else if (percentile >= 40) {
    rarityGuidance = `This user is MID-TIER in the guild — Rank #${rank} of ${scores.length} (${percentile}th percentile). Relative power: ${relativePower}%. MOST badges should be COMMON and RARE. Legendary ONLY for truly exceptional moments (~2-3 max). Epic only for clear mastery (~10%). Rare for solid work (~30%). Common for the rest (~55%).`;
  } else {
    rarityGuidance = `This user is BEGINNER-TIER in the guild — Rank #${rank} of ${scores.length} (${percentile}th percentile). Relative power: ${relativePower}%. ALMOST ALL badges must be COMMON. Rare ONLY for genuinely notable moments (~10% max). Epic/Legendary are FORBIDDEN unless they did something truly insane — and even then, cap at 1 epic max. Do NOT inflate rarity. They are still learning.`;
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

    await triggerMilestone('badge-earned', {
      userId: user.id,
      userName: user.name || user.email,
      message: `${user.name || user.email} earned the ${badge.rarity} badge: ${badge.name}!`,
      xp: 0,
      metadata: { badgeName: badge.name, rarity: badge.rarity },
    });
  }

  return newBadges.length;
}

export function parseBadges(text: string) {
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
    // Skip incomplete badges
    if (!badge.name) continue;
    // Defaults for missing fields
    if (!badge.rarity) badge.rarity = 'common';
    if (!badge.color) {
      badge.color = badge.rarity === 'legendary' ? '#f59e0b'
        : badge.rarity === 'epic' ? '#a855f7'
        : badge.rarity === 'rare' ? '#3b82f6'
        : '#6b7280';
    }
    if (!badge.icon) badge.icon = 'Zap';
    if (!badge.category) badge.category = 'skill';
    badges.push(badge);
  }

  return badges;
}
