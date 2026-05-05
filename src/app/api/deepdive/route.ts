import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deepDiveGitHub } from '@/lib/fetchers/github-deepdive';
import { generateInitialTreeFromDeepDive } from '@/lib/ai/skillTreeGenerator';
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

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.githubHandle) {
      return NextResponse.json({ error: 'No GitHub handle linked' }, { status: 400 });
    }

    if (!process.env.GITHUB_TOKEN) {
      return NextResponse.json({ error: 'No GitHub token configured' }, { status: 500 });
    }

    // ---------- PHASE 1: FETCH DEEP DIVE ----------
    console.log(`[DeepDive] Starting for ${user.githubHandle}...`);
    const deepDive = await deepDiveGitHub(user.githubHandle, process.env.GITHUB_TOKEN);
    console.log(`[DeepDive] Fetched ${deepDive.repos.length} repos, dominant path: ${deepDive.dominantPath}`);

    // ---------- PHASE 2: LLM ANALYSIS OF DEEP DIVE ----------
    const topRepos = deepDive.repos
      .slice(0, 8)
      .map(r => `- ${r.name} (${r.language || 'unknown'}, ${r.commitCount} commits, ${r.stars} stars): ${(r.description || 'No description').slice(0, 120)}`)
      .join('\n');

    const totalBytes = Object.values(deepDive.languageBreakdown).reduce((a, b) => a + b, 0);
    const topLanguages = Object.entries(deepDive.languageBreakdown)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([lang, bytes]) => `${lang}: ${Math.round((bytes / (totalBytes || 1)) * 100)}%`)
      .join(', ');

    const recentCommits = deepDive.repos
      .flatMap(r => r.recentCommitMessages.slice(0, 2).map(m => `[${r.name}] ${m}`))
      .slice(0, 15)
      .join('\n');

    const skillSummary = Object.entries(deepDive.skillSignals)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n');

    const analysisText = await groqGenerateText(`You are a senior technical recruiter who has just done a comprehensive analysis of a developer's entire GitHub history. Write a structured assessment in the EXACT format below.

GITHUB PROFILE:
- Login: ${deepDive.user.login}
- Bio: ${deepDive.user.bio || 'No bio'}
- Public repos: ${deepDive.user.publicRepos}
- Followers: ${deepDive.user.followers}
- Account age: ${new Date().getFullYear() - new Date(deepDive.user.createdAt).getFullYear()} years
- Estimated total commits: ${deepDive.totalCommitEstimate}

TOP LANGUAGES:
${topLanguages}

TOP REPOSITORIES:
${topRepos}

RECENT COMMITS:
${recentCommits}

TOPICS OF INTEREST:
${deepDive.topicInterests.slice(0, 15).join(', ')}

SKILL SIGNALS (heuristic scores from repo analysis):
${skillSummary}

OUTPUT FORMAT (respond ONLY in this format, no markdown code blocks):
ARCHETYPE: <one-line developer archetype>
GRIND_PATH: <one of: Frontend Wizard, Systems Engineer, Data Scientist, Fullstack Legend, DevOps Architect, Mobile Warrior, Security Phantom, Core>
STRENGTHS:
- <strength 1 with evidence>
- <strength 2 with evidence>
- <strength 3 with evidence>
- <strength 4 with evidence>
- <strength 5 with evidence>
GAPS:
- <gap 1>
- <gap 2>
- <gap 3>
- <gap 4>
- <gap 5>
RECOMMENDED_FOCUS: <what they should grind next>
NOTABLE_PROJECTS:
- <project 1 and why it's impressive>
- <project 2 and why it's impressive>
- <project 3 and why it's impressive>

Be thorough, specific, and honest. Don't flatter - identify real strengths AND real gaps.`);

    console.log(`[DeepDive] LLM analysis complete.`);

    // Parse the analysis text
    const analysis = parseAnalysis(analysisText);

    // ---------- PHASE 3: GENERATE PERSONALIZED SKILL TREE ----------
    const userStats = {
      totalXP: user.xp,
      totalCommits: user.totalCommits,
      totalPRs: user.totalPRs,
      leetcodeEasy: user.leetcodeEasy,
      leetcodeMedium: user.leetcodeMedium,
      leetcodeHard: user.leetcodeHard,
      codeforcesRating: user.codeforcesRating,
      codeforcesSolved: user.codeforcesSolved,
    };

    const initialNodes = await generateInitialTreeFromDeepDive(deepDive, userStats);
    console.log(`[DeepDive] Generated ${initialNodes.length} personalized nodes`);

    // ---------- PHASE 4: REPLACE EXISTING TREE ----------
    await prisma.$transaction(async (tx) => {
      // Delete old dynamic nodes
      await tx.dynamicSkillNode.deleteMany({ where: { userId: user.id } });

      // Create new nodes
      for (const node of initialNodes) {
        await tx.dynamicSkillNode.create({
          data: {
            userId: user.id,
            nodeId: node.nodeId,
            name: node.name,
            description: node.description,
            path: node.path,
            tier: node.tier,
            positionX: node.positionX,
            positionY: node.positionY,
            requirements: node.requirements as any,
            xpReward: node.xpReward,
            parentIds: node.parentIds,
            generatedBy: 'ai',
            unlocked: node.unlocked ?? (node.tier === 0),
          },
        });
      }

      // Save deep dive analysis as ghost snapshot
      await tx.ghostSnapshot.upsert({
        where: {
          userId_weekNumber_year: {
            userId: user.id,
            weekNumber: 0,
            year: new Date().getFullYear(),
          },
        },
        update: {
          totalXP: user.xp,
          skillBreakdown: deepDive.skillSignals,
          activityCounts: {
            deepDive: true,
            archetype: analysis.archetype,
            grindPath: analysis.grindPath,
            strengths: analysis.strengths,
            gaps: analysis.gaps,
            recommendedFocus: analysis.recommendedFocus,
            notableProjects: analysis.notableProjects,
            repos: deepDive.repos.map(r => ({ name: r.name, language: r.language, commits: r.commitCount, stars: r.stars })),
            languageBreakdown: deepDive.languageBreakdown,
            dominantPath: deepDive.dominantPath,
            rawAnalysis: analysisText,
          },
        },
        create: {
          userId: user.id,
          weekNumber: 0,
          year: new Date().getFullYear(),
          totalXP: user.xp,
          skillBreakdown: deepDive.skillSignals,
          activityCounts: {
            deepDive: true,
            archetype: analysis.archetype,
            grindPath: analysis.grindPath,
            strengths: analysis.strengths,
            gaps: analysis.gaps,
            recommendedFocus: analysis.recommendedFocus,
            notableProjects: analysis.notableProjects,
            repos: deepDive.repos.map(r => ({ name: r.name, language: r.language, commits: r.commitCount, stars: r.stars })),
            languageBreakdown: deepDive.languageBreakdown,
            dominantPath: deepDive.dominantPath,
            rawAnalysis: analysisText,
          },
        },
      });
    });

    // Trigger badge generation asynchronously
    try {
      const cronSecret = process.env.CRON_SECRET;
      if (cronSecret) {
        fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/badges`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${cronSecret}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: user.id }),
        }).catch(() => {});
      }
    } catch {}

    return NextResponse.json({
      success: true,
      archetype: analysis.archetype,
      grindPath: analysis.grindPath,
      strengths: analysis.strengths,
      gaps: analysis.gaps,
      recommendedFocus: analysis.recommendedFocus,
      notableProjects: analysis.notableProjects,
      nodesGenerated: initialNodes.length,
      reposAnalyzed: deepDive.repos.length,
      analysis: analysisText,
    });
  } catch (error: any) {
    console.error('[DeepDive] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function parseAnalysis(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const result: any = {
    archetype: '',
    grindPath: '',
    strengths: [],
    gaps: [],
    recommendedFocus: '',
    notableProjects: [],
  };

  let section: string | null = null;
  for (const line of lines) {
    if (line.startsWith('ARCHETYPE:')) {
      result.archetype = line.replace('ARCHETYPE:', '').trim();
      section = null;
    } else if (line.startsWith('GRIND_PATH:')) {
      result.grindPath = line.replace('GRIND_PATH:', '').trim();
      section = null;
    } else if (line.startsWith('STRENGTHS:')) {
      section = 'strengths';
    } else if (line.startsWith('GAPS:')) {
      section = 'gaps';
    } else if (line.startsWith('RECOMMENDED_FOCUS:')) {
      result.recommendedFocus = line.replace('RECOMMENDED_FOCUS:', '').trim();
      section = null;
    } else if (line.startsWith('NOTABLE_PROJECTS:')) {
      section = 'notableProjects';
    } else if (line.startsWith('- ') && section) {
      result[section].push(line.slice(2).trim());
    }
  }

  return result;
}