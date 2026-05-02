import { prisma } from '@/lib/prisma';
import { categorizeActivity } from './groq';

export interface SkillRadarData {
  subject: string;
  A: number;
  fullMark: number;
}

export async function generateSkillRadar(userId: string): Promise<SkillRadarData[]> {
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

  // Batch categorize uncategorized logs
  const uncategorizedLogs = logs.filter((log) => {
    const meta = log.metadata as Record<string, any> | null;
    return !meta?.category && log.description;
  });

  // Limit batch size to avoid token limits
  const BATCH_SIZE = 20;
  for (let i = 0; i < uncategorizedLogs.length; i += BATCH_SIZE) {
    const batch = uncategorizedLogs.slice(i, i + BATCH_SIZE);
    try {
      const descriptions = batch.map((l) => `[${l.platform}] ${l.description}`).join('\n');
      // For now, use a simple heuristic to avoid expensive Groq calls on every page load
      // We only call Groq for truly ambiguous cases
      batch.forEach((log) => {
        const platform = log.platform;
        const desc = (log.description || '').toLowerCase();

        let category = 'Algo';
        if (platform === 'LEETCODE' || platform === 'CODEFORCES') {
          category = 'Algo';
        } else if (platform === 'GITHUB') {
          if (desc.includes('react') || desc.includes('css') || desc.includes('ui') || desc.includes('frontend') || desc.includes('dom')) {
            category = 'Frontend';
          } else if (desc.includes('docker') || desc.includes('ci') || desc.includes('deploy') || desc.includes('infra')) {
            category = 'DevOps';
          } else if (desc.includes('arch') || desc.includes('design') || desc.includes('system')) {
            category = 'Architecture';
          } else {
            category = 'Backend';
          }
        } else if (platform === 'HACKERRANK') {
          category = 'Algo';
        }

        // Update the log with cached category
        prisma.activityLog.update({
          where: { id: log.id },
          data: { metadata: { ...(log.metadata as any), category } },
        }).catch(() => {});

        categories[category] += log.xpAwarded;
      });
    } catch {
      // fallback: distribute evenly
      batch.forEach((log) => {
        const category = log.platform === 'LEETCODE' || log.platform === 'CODEFORCES' ? 'Algo' : 'Backend';
        categories[category] += log.xpAwarded;
      });
    }
  }

  // Add already categorized logs
  logs.forEach((log) => {
    const meta = log.metadata as Record<string, any> | null;
    if (meta?.category && categories[meta.category] !== undefined) {
      categories[meta.category] += log.xpAwarded;
    }
  });

  // Normalize to 0-150 scale
  const maxValue = Math.max(...Object.values(categories), 1);
  const normalized = Object.entries(categories).map(([subject, value]) => ({
    subject,
    A: Math.round((value / maxValue) * 150),
    fullMark: 150,
  }));

  return normalized;
}
