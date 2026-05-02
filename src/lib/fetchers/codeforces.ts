const CODEFORCES_API = 'https://codeforces.com/api';

interface CodeforcesMetrics {
  handle: string;
  rating: number;
  maxRating: number;
  rank: string;
  maxRank: string;
  solvedCount: number;
  contestRating: number;
}

export async function fetchCodeforcesMetrics(handle: string): Promise<CodeforcesMetrics> {
  try {
    // Respect rate limit: 1 request per 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2100));

    const [userInfoRes, userStatusRes] = await Promise.all([
      fetch(`${CODEFORCES_API}/user.info?handles=${handle}`),
      fetch(`${CODEFORCES_API}/user.status?handle=${handle}`),
    ]);

    const userInfo = await userInfoRes.json();
    const userStatus = await userStatusRes.json();

    if (userInfo.status !== 'OK' || !userInfo.result?.[0]) {
      throw new Error(userInfo.comment || 'Codeforces user not found');
    }

    const user = userInfo.result[0];

    // Count unique solved problems
    const solvedProblems = new Set<string>();
    if (userStatus.status === 'OK') {
      userStatus.result.forEach((submission: any) => {
        if (submission.verdict === 'OK') {
          solvedProblems.add(`${submission.problem.contestId}-${submission.problem.index}`);
        }
      });
    }

    return {
      handle: user.handle,
      rating: user.rating || 0,
      maxRating: user.maxRating || 0,
      rank: user.rank || 'unrated',
      maxRank: user.maxRank || 'unrated',
      solvedCount: solvedProblems.size,
      contestRating: user.rating || 0,
    };
  } catch (error) {
    console.error('Codeforces fetch error:', error);
    return { handle, rating: 0, maxRating: 0, rank: '', maxRank: '', solvedCount: 0, contestRating: 0 };
  }
}
