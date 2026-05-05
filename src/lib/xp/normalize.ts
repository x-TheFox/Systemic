export const XP_TABLE = {
  GITHUB: {
    COMMIT: 15,
    PR_SIMPLE: 50,
    PR_COMPLEX_BASE: 75,
    PR_AI_MAX: 250,
    REVIEW: 15,
    REVIEW_COMMENT: 3,
    LANGUAGE_BONUS: 10,
  },
  LEETCODE: {
    EASY: 25,
    MEDIUM: 60,
    HARD: 120,
    CONTEST_RATING_MILESTONE: 200,
  },
  CODEFORCES: {
    PROBLEM_SOLVED: 30,
    RATING_MILESTONE: 200,
    RANK_UP_BONUS: {
      newbie: 0,
      pupil: 100,
      specialist: 200,
      expert: 400,
      'candidate master': 600,
      master: 1000,
      'international master': 1400,
      grandmaster: 2000,
      'international grandmaster': 2000,
      'legendary grandmaster': 2000,
    } as Record<string, number>,
  },
  HACKERRANK: {
    BADGE: 75,
    CERTIFICATE: 250,
    STAR: 25,
  },
  INTENSITY: {
    // Commit count thresholds → XP multiplier for commits that day
    5: 1.5,
    10: 2.0,
    20: 3.0,
    35: 4.0,
    50: 5.0,
  } as Record<number, number>,
  STREAK: {
    // Active day streak → multiplier for ALL daily XP
    2: 1.2,
    3: 1.35,
    5: 1.5,
    7: 1.75,
    10: 2.0,
    14: 2.5,
    21: 3.0,
    30: 4.0,
  } as Record<number, number>,
} as const;

// Cumulative milestones - one-time XP bonuses when thresholds are crossed
export const MILESTONE_XP = {
  COMMITS: [
    { threshold: 10, xp: 100, label: 'First Blood' },
    { threshold: 50, xp: 300, label: 'Getting Warm' },
    { threshold: 100, xp: 750, label: 'Centurion' },
    { threshold: 250, xp: 1500, label: 'Quarter K' },
    { threshold: 500, xp: 3000, label: 'Half Grand' },
    { threshold: 1000, xp: 7500, label: 'Kilo Commit' },
    { threshold: 2500, xp: 15000, label: 'Commit Machine' },
    { threshold: 5000, xp: 30000, label: 'Git Historian' },
    { threshold: 10000, xp: 75000, label: 'Legend of Git' },
  ],
  PRS: [
    { threshold: 1, xp: 100, label: 'First Merge' },
    { threshold: 5, xp: 250, label: 'Contributor' },
    { threshold: 10, xp: 500, label: 'PR Warrior' },
    { threshold: 25, xp: 1200, label: 'Merge Master' },
    { threshold: 50, xp: 2500, label: 'PR Legend' },
    { threshold: 100, xp: 6000, label: 'Pull Request God' },
  ],
  REVIEWS: [
    { threshold: 5, xp: 150, label: 'Code Critic' },
    { threshold: 25, xp: 500, label: 'Reviewer' },
    { threshold: 50, xp: 1000, label: 'Gatekeeper' },
    { threshold: 100, xp: 2500, label: 'Senior Reviewer' },
  ],
  LEETCODE: [
    { threshold: 10, xp: 200, label: 'Problem Solver' },
    { threshold: 50, xp: 750, label: 'Algo Apprentice' },
    { threshold: 100, xp: 1500, label: 'Century of Code' },
    { threshold: 250, xp: 4000, label: 'DSA Demon' },
    { threshold: 500, xp: 10000, label: 'LeetCode Legend' },
  ],
  STREAK_DAYS: [
    { threshold: 3, xp: 300, label: 'Warming Up' },
    { threshold: 7, xp: 800, label: 'Week Warrior' },
    { threshold: 14, xp: 2000, label: 'Two Week Grind' },
    { threshold: 30, xp: 6000, label: 'Monthly Monster' },
    { threshold: 60, xp: 15000, label: 'Seasoned' },
    { threshold: 100, xp: 35000, label: 'Century Streak' },
  ],
} as const;

export interface MilestoneResult {
  xp: number;
  labels: string[];
}

function getMilestonesCrossed(
  current: number,
  previous: number,
  milestones: readonly { threshold: number; xp: number; label: string }[]
): MilestoneResult {
  let xp = 0;
  const labels: string[] = [];
  for (const m of milestones) {
    if (previous < m.threshold && current >= m.threshold) {
      xp += m.xp;
      labels.push(m.label);
    }
  }
  return { xp, labels };
}

export function calculateMilestoneBonuses(
  prev: {
    commits: number;
    prs: number;
    reviews: number;
    leetcodeSolved: number;
    streakDays: number;
  },
  current: {
    commits: number;
    prs: number;
    reviews: number;
    leetcodeSolved: number;
    streakDays: number;
  }
): MilestoneResult {
  const commits = getMilestonesCrossed(current.commits, prev.commits, MILESTONE_XP.COMMITS);
  const prs = getMilestonesCrossed(current.prs, prev.prs, MILESTONE_XP.PRS);
  const reviews = getMilestonesCrossed(current.reviews, prev.reviews, MILESTONE_XP.REVIEWS);
  const leetcode = getMilestonesCrossed(current.leetcodeSolved, prev.leetcodeSolved, MILESTONE_XP.LEETCODE);
  const streak = getMilestonesCrossed(current.streakDays, prev.streakDays, MILESTONE_XP.STREAK_DAYS);

  return {
    xp: commits.xp + prs.xp + reviews.xp + leetcode.xp + streak.xp,
    labels: [...commits.labels, ...prs.labels, ...reviews.labels, ...leetcode.labels, ...streak.labels],
  };
}

export function getIntensityMultiplier(commitCount: number): number {
  const thresholds = Object.keys(XP_TABLE.INTENSITY)
    .map(Number)
    .sort((a, b) => a - b);
  let multiplier = 1;
  for (const t of thresholds) {
    if (commitCount >= t) {
      multiplier = XP_TABLE.INTENSITY[t as unknown as keyof typeof XP_TABLE.INTENSITY];
    }
  }
  return multiplier;
}

export function getStreakMultiplier(streakDays: number): number {
  const thresholds = Object.keys(XP_TABLE.STREAK)
    .map(Number)
    .sort((a, b) => a - b);
  let multiplier = 1;
  for (const t of thresholds) {
    if (streakDays >= t) {
      multiplier = XP_TABLE.STREAK[t as unknown as keyof typeof XP_TABLE.STREAK];
    }
  }
  return multiplier;
}

export function calculateLeetCodeXP(solved: { easy: number; medium: number; hard: number }, rating: number): number {
  let xp = 0;
  xp += solved.easy * XP_TABLE.LEETCODE.EASY;
  xp += solved.medium * XP_TABLE.LEETCODE.MEDIUM;
  xp += solved.hard * XP_TABLE.LEETCODE.HARD;

  if (rating > 0) {
    xp += Math.floor(rating / 100) * XP_TABLE.LEETCODE.CONTEST_RATING_MILESTONE;
  }

  return xp;
}

export function calculateGitHubXP(commits: number, mergedPRs: number, prComplexityScores: number[] = []): number {
  let xp = commits * XP_TABLE.GITHUB.COMMIT;

  if (prComplexityScores.length > 0) {
    xp += prComplexityScores.reduce((sum, score) => sum + score, 0);
  } else {
    xp += mergedPRs * XP_TABLE.GITHUB.PR_SIMPLE;
  }

  return xp;
}

export function calculateCodeforcesXP(solvedCount: number, rating: number, rank: string): number {
  let xp = solvedCount * XP_TABLE.CODEFORCES.PROBLEM_SOLVED;

  if (rating > 0) {
    xp += Math.floor(rating / 100) * XP_TABLE.CODEFORCES.RATING_MILESTONE;
  }

  const rankBonus = XP_TABLE.CODEFORCES.RANK_UP_BONUS[rank?.toLowerCase()] || 0;
  xp += rankBonus;

  return xp;
}

export function calculateHackerRankXP(badges: number, certificates: number, stars: number): number {
  let xp = 0;
  xp += badges * XP_TABLE.HACKERRANK.BADGE;
  xp += certificates * XP_TABLE.HACKERRANK.CERTIFICATE;
  xp += stars * XP_TABLE.HACKERRANK.STAR;
  return xp;
}

export function calculateTotalXP(
  github: { commits: number; mergedPRs: number; prScores?: number[] },
  leetcode: { solved: { easy: number; medium: number; hard: number }; rating: number },
  codeforces: { solvedCount: number; rating: number; rank: string },
  hackerrank: { badges: number; certificates: number; stars: number }
): number {
  return (
    calculateGitHubXP(github.commits, github.mergedPRs, github.prScores) +
    calculateLeetCodeXP(leetcode.solved, leetcode.rating) +
    calculateCodeforcesXP(codeforces.solvedCount, codeforces.rating, codeforces.rank) +
    calculateHackerRankXP(hackerrank.badges, hackerrank.certificates, hackerrank.stars)
  );
}
