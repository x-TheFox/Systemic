export const XP_TABLE = {
  GITHUB: {
    COMMIT: 5,
    PR_SIMPLE: 20,
    PR_COMPLEX_BASE: 30,
    PR_AI_MAX: 100,
    LANGUAGE_BONUS: 5, // per language used significantly (>10%)
  },
  LEETCODE: {
    EASY: 10,
    MEDIUM: 25,
    HARD: 50,
    CONTEST_RATING_MILESTONE: 100, // per 100 rating points
  },
  CODEFORCES: {
    PROBLEM_SOLVED: 15,
    RATING_MILESTONE: 100,
    RANK_UP_BONUS: {
      newbie: 0,
      pupil: 50,
      specialist: 100,
      expert: 200,
      'candidate master': 300,
      master: 500,
      'international master': 700,
      grandmaster: 1000,
      'international grandmaster': 1000,
      'legendary grandmaster': 1000,
    } as Record<string, number>,
  },
  HACKERRANK: {
    BADGE: 30,
    CERTIFICATE: 100,
    STAR: 10,
  },
} as const;

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
    // Use AI-evaluated PR complexity scores
    xp += prComplexityScores.reduce((sum, score) => sum + score, 0);
  } else {
    // Fallback: simple PR scoring
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
