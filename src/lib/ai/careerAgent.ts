import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { groqGenerateObject, groqGenerateText } from './groq-models';
import { duckduckgoSearch } from '../search/duckduckgo';

// -----------------------------------------------------------------------------
// Zod Schemas
// -----------------------------------------------------------------------------

const HypothesisResultSchema = z.object({
  archetype: z.string().describe("A compelling 2-3 word label for this user's engineering identity, e.g. 'Systems Architect' or 'Product-Fullstack Hybrid'"),
  proposedPaths: z.array(z.string()).min(1).max(6).describe("Specific career paths this user should consider"),
  questions: z.array(z.string()).max(3).optional().describe("Clarifying questions to ask the user before finalizing analysis"),
});

const ResearchResultSchema = z.object({
  matchScore: z.number().min(0).max(100).describe("How well this user matches the path (0-100)"),
  keyRequirements: z.array(z.string()).describe("Top requirements for this role in 2025"),
  userMapping: z.string().describe("How the user's current skills and projects map to this path"),
  salaryRange: z.string().describe("Typical salary range for this path"),
  demand: z.enum(['High', 'Medium', 'Low']).describe("Market demand level"),
});

const SkillGapSchema = z.object({
  skill: z.string(),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low']),
  reason: z.string(),
});

const ActionStepSchema = z.object({
  week: z.number().min(1).max(12),
  action: z.string(),
  platform: z.string().optional(),
  estimatedHours: z.number().optional(),
});

const RankedPathSchema = z.object({
  name: z.string(),
  matchScore: z.number().min(0).max(100),
  salaryRange: z.string(),
  demand: z.enum(['High', 'Medium', 'Low']),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  skillCoverage: z.string().describe("Summary of which skills the user already has vs needs"),
});

const CareerAnalysisOutputSchema = z.object({
  summary: z.string().describe("Overall archetype assessment in 2-3 sentences"),
  paths: z.array(RankedPathSchema).min(1).max(6),
  skillGaps: z.array(SkillGapSchema),
  actionPlan: z.array(ActionStepSchema),
  thinking: z.string().describe("Full reasoning chain for transparency"),
});

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type ProfileDigest = {
  userId: string;
  name: string | null;
  email: string;
  xp: number;
  handles: {
    github: string | null;
    leetcode: string | null;
    hackerrank: string | null;
    codeforces: string | null;
  };
  stats: {
    totalCommits: number;
    totalPRs: number;
    totalReviews: number;
    reviewComments: number;
    leetcodeEasy: number;
    leetcodeMedium: number;
    leetcodeHard: number;
    codeforcesRating: number;
    codeforcesSolved: number;
    hackerrankBadges: number;
  };
  title: string | null;
  projects: Array<{
    name: string;
    description: string | null;
    language: string | null;
    stars: number;
    forks: number;
    rarity: string;
    xpValue: number;
  }>;
  badges: Array<{
    name: string;
    rarity: string;
    category: string;
    description: string;
  }>;
  skillTree: {
    unlockedNodes: string[];
    currentGrind: string | null;
    progress: Record<string, number> | null;
  } | null;
  dynamicNodes: Array<{
    nodeId: string;
    name: string;
    path: string;
    tier: number;
    unlocked: boolean;
  }>;
  activityLog: Array<{
    platform: string;
    activityType: string;
    description: string | null;
    xpAwarded: number;
    timestamp: Date;
  }>;
  ghostSnapshot: {
    weekNumber: number;
    year: number;
    totalXP: number;
    skillBreakdown: Record<string, number>;
    activityCounts: Record<string, Record<string, number>>;
  } | null;
  duels: Array<{
    role: 'challenger' | 'opponent';
    status: string;
    winnerId: string | null;
    createdAt: Date;
  }>;
  guild: {
    name: string;
    slug: string;
  } | null;
  dailyActivity: Array<{
    date: string;
    xpGained: number;
    platforms: string[];
  }>;
};

export type HypothesisResult = z.infer<typeof HypothesisResultSchema>;
export type ResearchResult = z.infer<typeof ResearchResultSchema> & { path: string };
export type CareerAnalysisOutput = z.infer<typeof CareerAnalysisOutputSchema>;

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function truncateList<T>(arr: T[], max: number): T[] {
  return arr.slice(0, max);
}

// -----------------------------------------------------------------------------
// 1. Profile Ingestion
// -----------------------------------------------------------------------------

export async function ingestProfile(userId: string): Promise<ProfileDigest> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      projects: { orderBy: { xpValue: 'desc' }, take: 10 },
      badges: { orderBy: { createdAt: 'desc' }, take: 20 },
      skillTreeState: true,
      dynamicNodes: { orderBy: { tier: 'asc' }, take: 30 },
      activityLogs: { orderBy: { timestamp: 'desc' }, take: 50 },
      ghostSnapshots: { orderBy: { createdAt: 'desc' }, take: 1 },
      duelsAsChallenger: { orderBy: { createdAt: 'desc' }, take: 10 },
      duelsAsOpponent: { orderBy: { createdAt: 'desc' }, take: 10 },
      guild: true,
      dailyActivities: { orderBy: { date: 'desc' }, take: 30 },
    },
  });

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const allDuels = [
    ...user.duelsAsChallenger.map((d) => ({ ...d, role: 'challenger' as const })),
    ...user.duelsAsOpponent.map((d) => ({ ...d, role: 'opponent' as const })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const latestGhost = user.ghostSnapshots[0] ?? null;

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    xp: user.xp,
    handles: {
      github: user.githubHandle,
      leetcode: user.leetcodeHandle,
      hackerrank: user.hackerrankHandle,
      codeforces: user.codeforcesHandle,
    },
    stats: {
      totalCommits: user.totalCommits,
      totalPRs: user.totalPRs,
      totalReviews: user.totalReviews,
      reviewComments: user.reviewComments,
      leetcodeEasy: user.leetcodeEasy,
      leetcodeMedium: user.leetcodeMedium,
      leetcodeHard: user.leetcodeHard,
      codeforcesRating: user.codeforcesRating,
      codeforcesSolved: user.codeforcesSolved,
      hackerrankBadges: user.hackerrankBadges,
    },
    title: user.title,
    projects: user.projects.map((p) => ({
      name: p.name,
      description: p.description,
      language: p.language,
      stars: p.stars,
      forks: p.forks,
      rarity: p.rarity,
      xpValue: p.xpValue,
    })),
    badges: user.badges.map((b) => ({
      name: b.name,
      rarity: b.rarity,
      category: b.category,
      description: b.description,
    })),
    skillTree: user.skillTreeState
      ? {
          unlockedNodes: user.skillTreeState.unlockedNodes,
          currentGrind: user.skillTreeState.currentGrind,
          progress: (user.skillTreeState.progress as Record<string, number>) ?? null,
        }
      : null,
    dynamicNodes: user.dynamicNodes.map((n) => ({
      nodeId: n.nodeId,
      name: n.name,
      path: n.path,
      tier: n.tier,
      unlocked: n.unlocked,
    })),
    activityLog: user.activityLogs.map((a) => ({
      platform: a.platform,
      activityType: a.activityType,
      description: a.description,
      xpAwarded: a.xpAwarded,
      timestamp: a.timestamp,
    })),
    ghostSnapshot: latestGhost
      ? {
          weekNumber: latestGhost.weekNumber,
          year: latestGhost.year,
          totalXP: latestGhost.totalXP,
          skillBreakdown: (latestGhost.skillBreakdown as Record<string, number>) ?? {},
          activityCounts: (latestGhost.activityCounts as Record<string, Record<string, number>>) ?? {},
        }
      : null,
    duels: truncateList(allDuels, 10).map((d) => ({
      role: d.role,
      status: d.status,
      winnerId: d.winnerId,
      createdAt: d.createdAt,
    })),
    guild: user.guild
      ? {
          name: user.guild.name,
          slug: user.guild.slug,
        }
      : null,
    dailyActivity: user.dailyActivities.map((d) => ({
      date: d.date,
      xpGained: d.xpGained,
      platforms: d.platforms,
    })),
  };
}

// -----------------------------------------------------------------------------
// 2. Hypothesis Generation
// -----------------------------------------------------------------------------

export async function generateHypotheses(profile: ProfileDigest): Promise<HypothesisResult> {
  const prompt = buildHypothesisPrompt(profile);

  const fallback: HypothesisResult = {
    archetype: 'Generalist Software Engineer',
    proposedPaths: ['Fullstack Engineer', 'Backend Engineer', 'DevOps Engineer'],
    questions: [
      'Do you prefer working on user-facing products or internal infrastructure?',
      'Are you more interested in depth (specialization) or breadth (many technologies)?',
    ],
  };

  return groqGenerateObject(HypothesisResultSchema, prompt, fallback);
}

function buildHypothesisPrompt(profile: ProfileDigest): string {
  const lines: string[] = [
    'You are a senior career strategist analyzing a software engineer\'s profile.',
    '',
    'Based on the following profile data, identify their engineering archetype and propose 3-6 specific career paths they should consider.',
    'If the profile is sparse or ambiguous, ask 1-3 clarifying questions.',
    '',
    '--- PROFILE ---',
    `Name: ${profile.name ?? 'Unknown'}`,
    `Current Title: ${profile.title ?? 'None'}`,
    `Total XP: ${profile.xp}`,
    `Handles: GitHub=${profile.handles.github ?? 'N/A'}, LeetCode=${profile.handles.leetcode ?? 'N/A'}, Codeforces=${profile.handles.codeforces ?? 'N/A'}, HackerRank=${profile.handles.hackerrank ?? 'N/A'}`,
    '',
    'Stats:',
    `  Commits: ${profile.stats.totalCommits}, PRs: ${profile.stats.totalPRs}, Reviews: ${profile.stats.totalReviews}, Review Comments: ${profile.stats.reviewComments}`,
    `  LeetCode: ${profile.stats.leetcodeEasy}E / ${profile.stats.leetcodeMedium}M / ${profile.stats.leetcodeHard}H`,
    `  Codeforces: Rating ${profile.stats.codeforcesRating}, Solved ${profile.stats.codeforcesSolved}`,
    `  HackerRank Badges: ${profile.stats.hackerrankBadges}`,
    '',
    `Top Projects (${profile.projects.length}):`,
    ...profile.projects.map(
      (p) =>
        `  - ${p.name} (${p.language ?? 'Unknown'}): ${p.stars} stars, ${p.forks} forks, rarity=${p.rarity}, xp=${p.xpValue}${p.description ? ` | ${p.description}` : ''}`
    ),
    '',
    `Badges (${profile.badges.length}):`,
    ...profile.badges.slice(0, 10).map((b) => `  - [${b.rarity}] ${b.name} (${b.category}): ${b.description}`),
    '',
    `Skill Tree:`,
    `  Current Grind: ${profile.skillTree?.currentGrind ?? 'None'}`,
    `  Unlocked Nodes: ${profile.skillTree?.unlockedNodes.length ?? 0}`,
    `  Dynamic Nodes: ${profile.dynamicNodes.filter((n) => n.unlocked).length}/${profile.dynamicNodes.length} unlocked`,
    '',
    `Recent Activity (last ${profile.activityLog.length}):`,
    ...profile.activityLog.slice(0, 15).map((a) => `  [${formatDate(a.timestamp)}] ${a.platform}: ${a.activityType} (+${a.xpAwarded} XP)${a.description ? ` | ${a.description}` : ''}`),
    '',
    `Latest Ghost Snapshot:`,
    profile.ghostSnapshot
      ? `  Week ${profile.ghostSnapshot.weekNumber}-${profile.ghostSnapshot.year}: ${profile.ghostSnapshot.totalXP} XP`
      : '  None',
    '',
    `Guild: ${profile.guild ? profile.guild.name : 'None'}`,
    '',
    'Respond with ONLY valid JSON matching the required schema.',
  ];

  return lines.join('\n');
}

// -----------------------------------------------------------------------------
// 3. Path Research
// -----------------------------------------------------------------------------

export async function researchPath(path: string, profile: ProfileDigest): Promise<ResearchResult> {
  const queries = [
    `"${path}" job requirements 2025`,
    `"${path}" salary range`,
    `"${path}" skills in demand`,
  ];

  const searchResults = await Promise.all(
    queries.map(async (q) => {
      try {
        const results = await duckduckgoSearch(q, 3);
        return { query: q, results };
      } catch (err) {
        console.warn(`[CareerAgent] Search failed for "${q}":`, err);
        return { query: q, results: [] };
      }
    })
  );

  const prompt = buildResearchPrompt(path, profile, searchResults);

  const fallback: ResearchResult = {
    path,
    matchScore: 50,
    keyRequirements: ['Research unavailable — manual verification needed'],
    userMapping: 'Unable to synthesize mapping due to search failure.',
    salaryRange: 'Unknown',
    demand: 'Medium',
  };

  const result = await groqGenerateObject(ResearchResultSchema, prompt, fallback);
  return { ...result, path };
}

function buildResearchPrompt(
  path: string,
  profile: ProfileDigest,
  searchResults: Array<{ query: string; results: Array<{ title: string; snippet: string }> }>
): string {
  const lines: string[] = [
    `You are a career research analyst. Evaluate how well the following user profile matches the career path: "${path}".`,
    '',
    '--- USER PROFILE ---',
    `Total XP: ${profile.xp}`,
    `Title: ${profile.title ?? 'None'}`,
    `Languages/Projects: ${profile.projects.map((p) => p.language).filter(Boolean).join(', ')}`,
    `Top Projects: ${profile.projects.slice(0, 5).map((p) => p.name).join(', ')}`,
    `Stats: ${profile.stats.totalCommits} commits, ${profile.stats.totalPRs} PRs, LeetCode ${profile.stats.leetcodeEasy + profile.stats.leetcodeMedium + profile.stats.leetcodeHard} solved`,
    `Skill Tree Focus: ${profile.skillTree?.currentGrind ?? 'None'}`,
    `Badges: ${profile.badges.slice(0, 5).map((b) => b.name).join(', ')}`,
    '',
    '--- WEB SEARCH RESULTS ---',
  ];

  for (const { query, results } of searchResults) {
    lines.push(`Query: ${query}`);
    if (results.length === 0) {
      lines.push('  (no results)');
    } else {
      for (const r of results) {
        lines.push(`  - ${r.title}: ${r.snippet}`);
      }
    }
    lines.push('');
  }

  lines.push(
    'Synthesize the search results with the user profile. Provide a match score (0-100), key requirements, how the user maps, salary range, and demand level.',
    'Respond with ONLY valid JSON matching the required schema.'
  );

  return lines.join('\n');
}

// -----------------------------------------------------------------------------
// 4. Synthesis
// -----------------------------------------------------------------------------

export async function synthesizeAnalysis(
  profile: ProfileDigest,
  hypotheses: HypothesisResult,
  researchResults: ResearchResult[],
  userAnswers?: Record<string, string>
): Promise<CareerAnalysisOutput> {
  const prompt = buildSynthesisPrompt(profile, hypotheses, researchResults, userAnswers);

  // Generate a free-form reasoning chain first for richer transparency
  let enrichedThinking = '';
  try {
    enrichedThinking = await groqGenerateText(
      `${prompt}\n\nBefore returning JSON, write a detailed internal reasoning chain (2-3 paragraphs) explaining how you weighed each path, identified skill gaps, and constructed the action plan.`
    );
  } catch {
    enrichedThinking = 'Reasoning generation skipped due to rate limit or error.';
  }

  const fallback: CareerAnalysisOutput = {
    summary: `We analyzed ${profile.name ?? 'this engineer'}\'s profile and identified them as a ${hypotheses.archetype}. Due to processing constraints, this is a preliminary assessment.`,
    paths: researchResults.map((r) => ({
      name: r.path,
      matchScore: r.matchScore,
      salaryRange: r.salaryRange,
      demand: r.demand,
      pros: ['Aligned with current skills'],
      cons: ['Requires further research'],
      skillCoverage: r.userMapping,
    })),
    skillGaps: [],
    actionPlan: [
      { week: 1, action: 'Review the ranked career paths and pick a primary focus.', estimatedHours: 2 },
      { week: 2, action: 'Complete a small project or course in the chosen direction.', estimatedHours: 10 },
    ],
    thinking: 'Fallback synthesis due to LLM failure. Partial data used.',
  };

  const result = await groqGenerateObject(CareerAnalysisOutputSchema, prompt, fallback);
  return {
    ...result,
    thinking: enrichedThinking + '\n\n--- STRUCTURED OUTPUT REASONING ---\n' + result.thinking,
  };
}

function buildSynthesisPrompt(
  profile: ProfileDigest,
  hypotheses: HypothesisResult,
  researchResults: ResearchResult[],
  userAnswers?: Record<string, string>
): string {
  const lines: string[] = [
    'You are a principal staff engineer and career mentor writing a final career analysis report.',
    '',
    '--- USER PROFILE ---',
    `Name: ${profile.name ?? 'Unknown'}`,
    `Archetype: ${hypotheses.archetype}`,
    `XP: ${profile.xp}`,
    `Commits: ${profile.stats.totalCommits} | PRs: ${profile.stats.totalPRs} | Reviews: ${profile.stats.totalReviews}`,
    `LeetCode: ${profile.stats.leetcodeEasy}E/${profile.stats.leetcodeMedium}M/${profile.stats.leetcodeHard}H`,
    `Codeforces: ${profile.stats.codeforcesRating}`,
    `Projects: ${profile.projects.map((p) => `${p.name}(${p.language ?? '?'})`).join(', ')}`,
    `Skill Tree Grind: ${profile.skillTree?.currentGrind ?? 'None'}`,
    '',
    '--- PROPOSED PATHS (WITH RESEARCH) ---',
  ];

  for (const r of researchResults) {
    lines.push(
      `Path: ${r.path}`,
      `  Match Score: ${r.matchScore}/100`,
      `  Salary: ${r.salaryRange}`,
      `  Demand: ${r.demand}`,
      `  Key Requirements: ${r.keyRequirements.join('; ')}`,
      `  User Mapping: ${r.userMapping}`,
      ''
    );
  }

  if (userAnswers && Object.keys(userAnswers).length > 0) {
    lines.push('--- USER ANSWERS TO CLARIFYING QUESTIONS ---');
    for (const [q, a] of Object.entries(userAnswers)) {
      lines.push(`Q: ${q}\nA: ${a}`);
    }
    lines.push('');
  }

  lines.push(
    'Produce a final career analysis with:',
    '1. A concise summary (2-3 sentences) of the user\'s archetype and trajectory.',
    '2. Ranked paths with pros, cons, and skill coverage.',
    '3. Specific skill gaps with priority levels.',
    '4. A concrete 90-day action plan (weekly steps, estimated hours, suggested platforms).',
    '5. A full reasoning chain explaining how you arrived at these conclusions.',
    '',
    'Be specific, honest, and actionable. Do not sugarcoat weaknesses.',
    'Respond with ONLY valid JSON matching the required schema.'
  );

  return lines.join('\n');
}

// -----------------------------------------------------------------------------
// 5. Orchestrator
// -----------------------------------------------------------------------------

export async function runCareerAnalysis(
  userId: string,
  userAnswers?: Record<string, string>
): Promise<{ success: boolean; recordId?: string; error?: string; partial?: boolean }> {
  let thinkingLog = '';
  const appendThinking = (step: string, detail: string) => {
    const entry = `[${new Date().toISOString()}] ${step}: ${detail}`;
    thinkingLog += entry + '\n';
    console.log(`[CareerAgent] ${entry}`);
  };

  let analysisRecord = await prisma.careerAnalysis.findUnique({
    where: { userId },
  });

  const upsertData = {
    status: 'analyzing',
    thinking: thinkingLog,
    questions: null as unknown as undefined,
    summary: null as unknown as undefined,
    archetype: null as unknown as undefined,
    paths: null as unknown as undefined,
    skillGaps: null as unknown as undefined,
    actionPlan: null as unknown as undefined,
  };

  if (analysisRecord) {
    analysisRecord = await prisma.careerAnalysis.update({
      where: { userId },
      data: upsertData,
    });
  } else {
    analysisRecord = await prisma.careerAnalysis.create({
      data: { userId, ...upsertData },
    });
  }

  try {
    appendThinking('INGEST', `Fetching profile for user ${userId}`);
    const profile = await ingestProfile(userId);
    appendThinking('INGEST', `Profile loaded: ${profile.xp} XP, ${profile.projects.length} projects, ${profile.badges.length} badges`);

    appendThinking('HYPOTHESIS', 'Generating career hypotheses');
    const hypotheses = await generateHypotheses(profile);
    appendThinking('HYPOTHESIS', `Archetype: ${hypotheses.archetype} | Paths: ${hypotheses.proposedPaths.join(', ')}`);

    if (hypotheses.questions && hypotheses.questions.length > 0 && !userAnswers) {
      appendThinking('QUESTIONS', `Asking ${hypotheses.questions.length} clarifying questions`);
      await prisma.careerAnalysis.update({
        where: { userId },
        data: {
          status: 'questions',
          archetype: hypotheses.archetype,
          questions: hypotheses.questions as any,
          thinking: thinkingLog,
        },
      });
      return { success: true, recordId: analysisRecord.id, partial: true };
    }

    appendThinking('RESEARCH', `Researching ${hypotheses.proposedPaths.length} paths`);
    const researchResults: ResearchResult[] = [];
    for (const path of hypotheses.proposedPaths) {
      try {
        const result = await researchPath(path, profile);
        researchResults.push(result);
        appendThinking('RESEARCH', `${path}: ${result.matchScore}/100, demand=${result.demand}`);
      } catch (err: any) {
        const msg = `Research failed for "${path}": ${err?.message ?? String(err)}`;
        appendThinking('RESEARCH_ERROR', msg);
        researchResults.push({
          path,
          matchScore: 0,
          keyRequirements: ['Research failed'],
          userMapping: 'Unable to evaluate.',
          salaryRange: 'Unknown',
          demand: 'Medium',
        });
      }
    }

    appendThinking('SYNTHESIZE', 'Running final synthesis');
    const final = await synthesizeAnalysis(profile, hypotheses, researchResults, userAnswers);
    appendThinking('SYNTHESIZE', `Produced ${final.paths.length} ranked paths, ${final.skillGaps.length} skill gaps, ${final.actionPlan.length} action steps`);

    await prisma.careerAnalysis.update({
      where: { userId },
      data: {
        status: 'complete',
        archetype: hypotheses.archetype,
        summary: final.summary,
        paths: final.paths as any,
        skillGaps: final.skillGaps as any,
        actionPlan: final.actionPlan as any,
        thinking: thinkingLog + '\n\n--- FINAL REASONING ---\n' + final.thinking,
        questions: userAnswers
          ? (Object.entries(userAnswers).map(([q, a]) => ({ question: q, answer: a })) as any)
          : null,
      },
    });

    return { success: true, recordId: analysisRecord.id, partial: false };
  } catch (err: any) {
    const errorMsg = err?.message ?? String(err);
    appendThinking('FATAL_ERROR', errorMsg);

    await prisma.careerAnalysis.update({
      where: { userId },
      data: {
        status: 'complete',
        thinking: thinkingLog,
      },
    });

    return { success: false, recordId: analysisRecord.id, error: errorMsg, partial: true };
  }
}
