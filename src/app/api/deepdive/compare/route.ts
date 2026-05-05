import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deepDiveGitHub } from '@/lib/fetchers/github-deepdive';
import { groqGenerateText } from '@/lib/ai/groq-models';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface DeepDiveSnapshot {
  deepDive: boolean;
  archetype: string;
  grindPath: string;
  strengths: string[];
  gaps: string[];
  recommendedFocus: string;
  notableProjects: string[];
  repos: { name: string; language: string | null; commits: number; stars: number }[];
  languageBreakdown: Record<string, number>;
  dominantPath: string;
  rawAnalysis: string;
}

interface DeepDiveData {
  snapshot: DeepDiveSnapshot;
  skillBreakdown: Record<string, number>;
}

async function fetchOrCreateDeepDive(githubHandle: string): Promise<{ user: { id: string; githubHandle: string | null; xp: number }; data: DeepDiveData }> {
  const user = await prisma.user.findFirst({
    where: {
      githubHandle: {
        equals: githubHandle,
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
      githubHandle: true,
      xp: true,
    },
  });

  if (!user) {
    throw new Error(`User not found: ${githubHandle}`);
  }

  // Check for existing deep dive snapshot
  const existing = await prisma.ghostSnapshot.findUnique({
    where: {
      userId_weekNumber_year: {
        userId: user.id,
        weekNumber: 0,
        year: new Date().getFullYear(),
      },
    },
  });

  if (existing && (existing.activityCounts as any)?.deepDive === true) {
    return {
      user,
      data: {
        snapshot: existing.activityCounts as unknown as DeepDiveSnapshot,
        skillBreakdown: (existing.skillBreakdown as unknown as Record<string, number>) || {},
      },
    };
  }

  // No deep dive exists — generate one
  if (!process.env.GITHUB_TOKEN) {
    throw new Error('No GitHub token configured');
  }

  const deepDive = await deepDiveGitHub(user.githubHandle!, process.env.GITHUB_TOKEN);

  // Build a simplified snapshot for comparison
  const totalBytes = Object.values(deepDive.languageBreakdown).reduce((a, b) => a + b, 0);
  const topLanguages = Object.entries(deepDive.languageBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([lang, bytes]) => `${lang}: ${Math.round((bytes / (totalBytes || 1)) * 100)}%`)
    .join(', ');

  const topRepos = deepDive.repos
    .slice(0, 8)
    .map(r => `- ${r.name} (${r.language || 'unknown'}, ${r.commitCount} commits, ${r.stars} stars): ${(r.description || 'No description').slice(0, 120)}`)
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

  const analysis = parseAnalysis(analysisText);

  const snapshot: DeepDiveSnapshot = {
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
  };

  // Upsert ghost snapshot
  await prisma.ghostSnapshot.upsert({
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
      activityCounts: snapshot as any,
    },
    create: {
      userId: user.id,
      weekNumber: 0,
      year: new Date().getFullYear(),
      totalXP: user.xp,
      skillBreakdown: deepDive.skillSignals,
      activityCounts: snapshot as any,
    },
  });

  return {
    user,
    data: {
      snapshot,
      skillBreakdown: deepDive.skillSignals,
    },
  };
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { githubHandle1, githubHandle2 } = body;

    if (!githubHandle1 || !githubHandle2) {
      return NextResponse.json(
        { error: 'githubHandle1 and githubHandle2 required' },
        { status: 400 }
      );
    }

    if (githubHandle1.toLowerCase() === githubHandle2.toLowerCase()) {
      return NextResponse.json(
        { error: 'Cannot compare a developer with themselves' },
        { status: 400 }
      );
    }

    // Fetch or generate deep dives for both users in parallel
    const [dev1Result, dev2Result] = await Promise.all([
      fetchOrCreateDeepDive(githubHandle1),
      fetchOrCreateDeepDive(githubHandle2),
    ]);

    const { data: d1 } = dev1Result;
    const { data: d2 } = dev2Result;
    const s1 = d1.snapshot;
    const s2 = d2.snapshot;

    // Build comparison prompt
    const totalBytes1 = Object.values(s1.languageBreakdown).reduce((a, b) => a + b, 0);
    const topLangs1 = Object.entries(s1.languageBreakdown)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([lang, bytes]) => `${lang} ${Math.round((bytes / (totalBytes1 || 1)) * 100)}%`)
      .join(', ');

    const totalBytes2 = Object.values(s2.languageBreakdown).reduce((a, b) => a + b, 0);
    const topLangs2 = Object.entries(s2.languageBreakdown)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([lang, bytes]) => `${lang} ${Math.round((bytes / (totalBytes2 || 1)) * 100)}%`)
      .join(', ');

    const skillSignals1 = Object.entries(d1.skillBreakdown)
      .filter(([, v]) => typeof v === 'number' && v > 0)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    const skillSignals2 = Object.entries(d2.skillBreakdown)
      .filter(([, v]) => typeof v === 'number' && v > 0)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    const prompt = `You are a senior technical recruiter conducting a side-by-side comparison of two developers based on their complete GitHub histories. Write a structured, honest, and insightful comparison.

=== DEVELOPER 1: ${githubHandle1} ===
ARCHETYPE: ${s1.archetype}
GRIND PATH: ${s1.grindPath}
DOMINANT PATH: ${s1.dominantPath}
TOP LANGUAGES: ${topLangs1}
REPOSITORIES: ${s1.repos.length}
TOP REPOS:
${s1.repos.slice(0, 5).map(r => `- ${r.name} (${r.language || 'unknown'}, ${r.commits} commits, ${r.stars} stars)`).join('\n')}
STRENGTHS:
${s1.strengths.slice(0, 4).map(s => `- ${s}`).join('\n')}
GAPS:
${s1.gaps.slice(0, 3).map(g => `- ${g}`).join('\n')}
SKILL SIGNALS:
${skillSignals1}

=== DEVELOPER 2: ${githubHandle2} ===
ARCHETYPE: ${s2.archetype}
GRIND PATH: ${s2.grindPath}
DOMINANT PATH: ${s2.dominantPath}
TOP LANGUAGES: ${topLangs2}
REPOSITORIES: ${s2.repos.length}
TOP REPOS:
${s2.repos.slice(0, 5).map(r => `- ${r.name} (${r.language || 'unknown'}, ${r.commits} commits, ${r.stars} stars)`).join('\n')}
STRENGTHS:
${s2.strengths.slice(0, 4).map(s => `- ${s}`).join('\n')}
GAPS:
${s2.gaps.slice(0, 3).map(g => `- ${g}`).join('\n')}
SKILL SIGNALS:
${skillSignals2}

OUTPUT FORMAT (respond ONLY in this format, no markdown code blocks):
HEAD_TO_HEAD: <2-3 sentence overall comparison summary>
PATH_CLASH: <who wins on dominant path and why — or if they complement each other>
LANGUAGE_WARS: <compare language portfolios and technical breadth>
ARCHITECTURE_STYLE: <compare architectural approach — monoliths vs microservices vs libraries vs apps>
REPO_DEPTH: <compare repo quality, stars, commit depth>
SKILL_SIGNALS: <compare inferred skill profiles — frontend, backend, systems, data, devops, etc.>
VERDICT: <bold final verdict on who has the edge and in what dimensions. Be honest, not diplomatic.>

Be specific, use evidence from the data, and don't flatter either developer. Identify real comparative advantages.`;

    const comparisonText = await groqGenerateText(prompt);

    return NextResponse.json({
      comparison: comparisonText,
      dev1: {
        githubHandle: githubHandle1,
        archetype: s1.archetype,
        grindPath: s1.grindPath,
        dominantPath: s1.dominantPath,
        topLanguages: topLangs1,
        repos: s1.repos,
        strengths: s1.strengths,
        gaps: s1.gaps,
        skillSignals: d1.skillBreakdown,
      },
      dev2: {
        githubHandle: githubHandle2,
        archetype: s2.archetype,
        grindPath: s2.grindPath,
        dominantPath: s2.dominantPath,
        topLanguages: topLangs2,
        repos: s2.repos,
        strengths: s2.strengths,
        gaps: s2.gaps,
        skillSignals: d2.skillBreakdown,
      },
    });
  } catch (error: any) {
    console.error('[DeepDiveCompare] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
