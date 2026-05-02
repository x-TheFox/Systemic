const GITHUB_GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';
const GITHUB_REST_ENDPOINT = 'https://api.github.com';

interface GitHubMetrics {
  commits: number;
  prs: number;
  mergedPRs: number;
  languageDistribution: Record<string, number>;
  recentPRs: Array<{
    title: string;
    url: string;
    mergedAt: string | null;
    createdAt: string;
  }>;
}

export async function fetchGitHubMetrics(handle: string, token?: string): Promise<GitHubMetrics> {
  const authToken = token || process.env.GITHUB_TOKEN;
  if (!authToken) {
    console.warn('No GitHub token provided');
    return { commits: 0, prs: 0, mergedPRs: 0, languageDistribution: {}, recentPRs: [] };
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // GraphQL for commits, languages, and recent PRs
  const gqlQuery = `
    query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          totalCommitContributions
          restrictedContributionsCount
        }
        pullRequests(first: 25, states: [MERGED, OPEN], orderBy: {field: CREATED_AT, direction: DESC}) {
          totalCount
          nodes {
            title
            url
            mergedAt
            createdAt
            additions
            deletions
            changedFiles
          }
        }
        repositories(first: 100, isFork: false, ownerAffiliations: OWNER) {
          nodes {
            languages(first: 5, orderBy: {field: SIZE, direction: DESC}) {
              edges {
                size
                node {
                  name
                }
              }
            }
          }
        }
      }
    }
  `;

  // REST for total merged PR count (GraphQL aliases on connections are unreliable)
  const restUrl = `${GITHUB_REST_ENDPOINT}/search/issues?q=type:pr+author:${handle}+is:merged&per_page=1`;

  let totalMergedPRs = 0;
  let commits = 0;
  let prsFromGQL = 0;
  let recentPRs: GitHubMetrics['recentPRs'] = [];
  const languageDistribution: Record<string, number> = {};

  // Fetch both in parallel
  const [gqlResponse, restResponse] = await Promise.all([
    fetch(GITHUB_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: gqlQuery, variables: { login: handle } }),
    }),
    fetch(restUrl, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    }),
  ]);

  // Process GraphQL
  if (gqlResponse.ok) {
    const data = await gqlResponse.json();
    const user = data?.data?.user;
    if (user) {
      commits = (user.contributionsCollection?.totalCommitContributions || 0) +
                (user.contributionsCollection?.restrictedContributionsCount || 0);
      prsFromGQL = user.pullRequests?.totalCount || 0;

      const allRecentNodes = (user.pullRequests?.nodes || []).filter((pr: any) => pr != null);
      recentPRs = allRecentNodes
        .filter((pr: any) => new Date(pr.createdAt) >= new Date(thirtyDaysAgo))
        .map((pr: any) => ({
          title: pr.title,
          url: pr.url,
          mergedAt: pr.mergedAt,
          createdAt: pr.createdAt,
        }));

      let totalSize = 0;
      user.repositories?.nodes?.forEach((repo: any) => {
        repo.languages?.edges?.forEach((edge: any) => {
          const name = edge.node.name;
          const size = edge.size;
          languageDistribution[name] = (languageDistribution[name] || 0) + size;
          totalSize += size;
        });
      });

      if (totalSize > 0) {
        for (const key in languageDistribution) {
          languageDistribution[key] = Math.round((languageDistribution[key] / totalSize) * 100);
        }
      }
    }
  } else {
    console.error('GitHub GraphQL error:', gqlResponse.status);
  }

  // Process REST — get total merged PRs from search API
  if (restResponse.ok) {
    const restData = await restResponse.json();
    totalMergedPRs = restData?.total_count || 0;
  } else {
    console.error('GitHub REST search error:', restResponse.status);
    // Fallback: use GraphQL count if REST fails
    totalMergedPRs = prsFromGQL;
  }

  // Ensure mergedPRs is never less than recent PRs we know are merged
  const recentMerged = recentPRs.filter(pr => pr.mergedAt != null).length;
  if (totalMergedPRs < recentMerged && recentMerged > 0) {
    totalMergedPRs = recentMerged;
  }

  return {
    commits,
    prs: prsFromGQL,
    mergedPRs: totalMergedPRs,
    languageDistribution,
    recentPRs,
  };
}

export async function fetchPRDiff(prUrl: string, token?: string): Promise<string> {
  const authToken = token || process.env.GITHUB_TOKEN;
  if (!authToken) return '';

  const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) return '';

  const [, owner, repo, prNumber] = match;

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Accept': 'application/vnd.github.v3.diff',
        },
      }
    );

    if (!response.ok) return '';
    return await response.text();
  } catch {
    return '';
  }
}