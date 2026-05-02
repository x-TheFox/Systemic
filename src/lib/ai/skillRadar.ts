import { prisma } from '@/lib/prisma';
import { classifyLeetCodeTags, categorizeActivity } from './groq';

export interface SkillRadarData {
  subject: string;
  A: number;
  fullMark: number;
}

export async function generateSkillRadar(userId: string): Promise<SkillRadarData[]> {
  const logs = await prisma.activityLog.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    take: 500,
  });

  const categories: Record<string, number> = {
    Frontend: 0,
    Backend: 0,
    DevOps: 0,
    Architecture: 0,
    Algo: 0,
  };

  for (const log of logs) {
    const meta = log.metadata as Record<string, any> | null;
    
    if (meta?.category && categories[meta.category] !== undefined) {
      categories[meta.category] += log.xpAwarded;
      continue;
    }

    // Fallback: try to categorize from description
    if (log.description) {
      try {
        const result = await categorizeActivity(log.description, log.platform);
        categories[result.category] += log.xpAwarded;
      } catch {
        // Default to Algo for LeetCode, Backend for GitHub
        if (log.platform === 'LEETCODE') categories['Algo'] += log.xpAwarded;
        else if (log.platform === 'GITHUB') categories['Backend'] += log.xpAwarded;
        else categories['Algo'] += log.xpAwarded;
      }
    } else {
      if (log.platform === 'LEETCODE') categories['Algo'] += log.xpAwarded;
      else if (log.platform === 'GITHUB') categories['Backend'] += log.xpAwarded;
      else categories['Algo'] += log.xpAwarded;
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

export async function generateSkillRadarFromLeetCodeTags(userId: string, tags: Record<string, number>): Promise<SkillRadarData[]> {
  try {
    const tagList = Object.entries(tags).map(([tag, count]) => `${tag}(${count})`);
    const classified = await classifyLeetCodeTags(tagList);
    
    const maxValue = Math.max(...Object.values(classified), 1);
    return Object.entries(classified).map(([subject, value]) => ({
      subject,
      A: Math.round((value / maxValue) * 150),
      fullMark: 150,
    }));
  } catch {
    return generateSkillRadar(userId);
  }
}
