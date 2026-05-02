import { prisma } from '@/lib/prisma';

export interface SkillRadarData {
  subject: string;
  A: number;
  fullMark: number;
}

const RADAR_AXES = ['Frontend', 'Backend', 'DevOps', 'Architecture', 'Algo'];

/**
 * Maps deep-dive skill signals to the 5 radar axes.
 */
function mapDeepDiveSignals(signals: Record<string, number>): Record<string, number> {
  const mapped: Record<string, number> = {
    Frontend: signals.frontend || 0,
    Backend: (signals.backend || 0) + (signals.systems || 0) * 0.5,
    DevOps: signals.devops || 0,
    Architecture: (signals.architecture || 0) + (signals.systems || 0) * 0.5 + (signals.security || 0) * 0.3,
    Algo: (signals.algo || 0) + (signals.dataScience || 0) * 0.5,
  };
  return mapped;
}

/**
 * Improved heuristic that considers repo context, languages, and file paths
 * instead of just PR title keywords.
 */
function categorizeLog(log: any): string {
  const platform = log.platform;
  const desc = (log.description || '').toLowerCase();
  const meta = log.metadata as Record<string, any> | null;

  // Platform-based defaults
  if (platform === 'LEETCODE' || platform === 'CODEFORCES' || platform === 'HACKERRANK') {
    return 'Algo';
  }

  if (platform === 'GITHUB') {
    // Check languages from metadata
    const languages = meta?.languages || {};
    const langNames = Object.keys(languages).map((l: string) => l.toLowerCase());

    // Frontend languages strongly suggest frontend work
    const frontendLangs = ['javascript', 'typescript', 'html', 'css', 'svelte', 'vue'];
    const hasFrontendLang = langNames.some((l: string) => frontendLangs.includes(l));

    // Systems languages
    const systemsLangs = ['c', 'c++', 'rust', 'zig', 'assembly'];
    const hasSystemsLang = langNames.some((l: string) => systemsLangs.includes(l));

    // PR description keywords
    const frontendKeywords = ['react', 'vue', 'angular', 'svelte', 'next', 'nuxt', 'tailwind', 'css', 'html', 'dom', 'ui', 'component', 'styled', 'frontend', 'page', 'layout', 'responsive'];
    const devopsKeywords = ['docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'cicd', 'ci/cd', 'deploy', 'aws', 'gcp', 'azure', 'cloud', 'devops', 'helm', 'nginx', 'jenkins', 'github actions', 'pipeline'];
    const archKeywords = ['architecture', 'design system', 'monorepo', 'system design', 'scalab', 'distributed', 'event-driven', 'cqrs', 'ddd', 'microservice'];
    const algoKeywords = ['algorithm', 'leetcode', 'competitive', 'data structure', 'graph', 'tree', 'dynamic programming', 'sorting', 'search'];
    const backendKeywords = ['api', 'server', 'database', 'sql', 'postgres', 'mongodb', 'redis', 'graphql', 'rest', 'grpc', 'backend', 'endpoint'];

    // Count keyword matches
    let frontendScore = frontendKeywords.filter((k) => desc.includes(k)).length;
    const devopsScore = devopsKeywords.filter((k) => desc.includes(k)).length;
    let archScore = archKeywords.filter((k) => desc.includes(k)).length;
    const algoScore = algoKeywords.filter((k) => desc.includes(k)).length;
    const backendScore = backendKeywords.filter((k) => desc.includes(k)).length;

    // Language bonuses
    if (hasFrontendLang) frontendScore += 2;
    if (hasSystemsLang) archScore += 1;

    // Pick the highest score
    const scores = [
      { category: 'Frontend', score: frontendScore },
      { category: 'DevOps', score: devopsScore },
      { category: 'Architecture', score: archScore },
      { category: 'Algo', score: algoScore },
      { category: 'Backend', score: backendScore },
    ];

    const best = scores.sort((a, b) => b.score - a.score)[0];
    return best.score > 0 ? best.category : 'Backend';
  }

  return 'Backend';
}

export async function generateSkillRadar(userId: string): Promise<SkillRadarData[]> {
  // ---------- TRY DEEP DIVE FIRST ----------
  const deepDiveSnapshot = await prisma.ghostSnapshot.findFirst({
    where: { userId, weekNumber: 0 },
    orderBy: { createdAt: 'desc' },
  });

  if (deepDiveSnapshot) {
    const signals = deepDiveSnapshot.skillBreakdown as Record<string, number> || {};
    const mapped = mapDeepDiveSignals(signals);

    // Normalize to 0-150
    const maxValue = Math.max(...Object.values(mapped), 1);
    return RADAR_AXES.map((subject) => ({
      subject,
      A: Math.round((mapped[subject] / maxValue) * 150),
      fullMark: 150,
    }));
  }

  // ---------- FALLBACK: ACTIVITY LOG HEURISTIC ----------
  const logs = await prisma.activityLog.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    take: 200,
  });

  const categories: Record<string, number> = {
    Frontend: 0,
    Backend: 0,
    DevOps: 0,
    Architecture: 0,
    Algo: 0,
  };

  // Process all logs with improved heuristic
  for (const log of logs) {
    const meta = log.metadata as Record<string, any> | null;
    let category = meta?.category;

    if (!category) {
      category = categorizeLog(log);
      // Fire-and-forget cache
      prisma.activityLog.update({
        where: { id: log.id },
        data: { metadata: { ...meta, category } },
      }).catch(() => {});
    }

    if (categories[category] !== undefined) {
      categories[category] += log.xpAwarded;
    }
  }

  // Normalize to 0-150 scale
  const maxValue = Math.max(...Object.values(categories), 1);
  const normalized = Object.entries(categories).map(([subject, value]) => ({
    subject,
    A: Math.round((value / maxValue) * 150),
    fullMark: 150,
  }));

  return normalized;
}