const LEETCODE_GRAPHQL_ENDPOINT = 'https://leetcode.com/graphql';

interface LeetCodeMetrics {
  solved: {
    easy: number;
    medium: number;
    hard: number;
    total: number;
  };
  rating: number;
  ranking: number;
  contestAttended: number;
  contestTopPercentage: number;
}

export async function fetchLeetCodeMetrics(handle: string): Promise<LeetCodeMetrics> {
  const userProfileQuery = `
    query userProfile($username: String!) {
      matchedUser(username: $username) {
        submitStats {
          acSubmissionNum {
            difficulty
            count
            submissions
          }
        }
        profile {
          ranking
        }
      }
    }
  `;

  const contestQuery = `
    query userContestRanking($username: String!) {
      userContestRanking(username: $username) {
        attendedContestsCount
        rating
        globalRanking
        topPercentage
      }
    }
  `;

  try {
    const [profileRes, contestRes] = await Promise.all([
      fetch(LEETCODE_GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Referer': 'https://leetcode.com' },
        body: JSON.stringify({ query: userProfileQuery, variables: { username: handle } }),
      }),
      fetch(LEETCODE_GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Referer': 'https://leetcode.com' },
        body: JSON.stringify({ query: contestQuery, variables: { username: handle } }),
      }),
    ]);

    const profileData = await profileRes.json();
    const contestData = await contestRes.json();

    const acSubmissions = profileData?.data?.matchedUser?.submitStats?.acSubmissionNum || [];
    const solved = { easy: 0, medium: 0, hard: 0, total: 0 };

    acSubmissions.forEach((item: any) => {
      if (item.difficulty === 'Easy') solved.easy = item.count;
      if (item.difficulty === 'Medium') solved.medium = item.count;
      if (item.difficulty === 'Hard') solved.hard = item.count;
      if (item.difficulty === 'All') solved.total = item.count;
    });

    const contestRanking = contestData?.data?.userContestRanking || {};

    return {
      solved,
      rating: contestRanking.rating || 0,
      ranking: profileData?.data?.matchedUser?.profile?.ranking || 0,
      contestAttended: contestRanking.attendedContestsCount || 0,
      contestTopPercentage: contestRanking.topPercentage || 0,
    };
  } catch (error: any) {
    console.error('[LeetCode] Error fetching metrics:', error);
    throw new Error(`LeetCode fetch failed: ${error?.message || 'Unknown error'}`);
  }
}

export async function fetchLeetCodeProblemTags(handle: string): Promise<Record<string, number>> {
  const query = `
    query userProfile($username: String!) {
      matchedUser(username: $username) {
        tagProblemCounts {
          advanced {
            tagName
            problemsSolved
          }
          intermediate {
            tagName
            problemsSolved
          }
          fundamental {
            tagName
            problemsSolved
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(LEETCODE_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Referer': 'https://leetcode.com' },
      body: JSON.stringify({ query, variables: { username: handle } }),
    });

    const data = await response.json();
    const tagCounts = data?.data?.matchedUser?.tagProblemCounts;
    const tags: Record<string, number> = {};

    ['advanced', 'intermediate', 'fundamental'].forEach((level) => {
      tagCounts?.[level]?.forEach((tag: any) => {
        tags[tag.tagName] = (tags[tag.tagName] || 0) + tag.problemsSolved;
      });
    });

    return tags;
  } catch (error: any) {
    console.error('[LeetCode] Error fetching problem tags:', error);
    throw new Error(`LeetCode problem tags fetch failed: ${error?.message || 'Unknown error'}`);
  }
}
