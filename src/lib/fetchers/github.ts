const GITHUB_GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';

interface GitHubMetrics {
  commits: number;
  prs: number;
  mergedPRs: number;
  languageDistribution: Record<string, number>;
  recentPRs: Array<{
    title: string;
    url: string;
    diff?: string;
    mergedAt: string;
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

  const query = `
    query($login: String!, $since: DateTime!) {
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
            files(first: 1) {
              nodes {
                additions
                deletions
                path
              }
            }
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

  try {
    const response = await fetch(GITHUB_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables: { login: handle, since: thirtyDaysAgo } }),
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    const user = data?.data?.user;

    if (!user) {
      return { commits: 0, prs: 0, mergedPRs: 0, languageDistribution: {}, recentPRs: [] };
    }

    const commits = (user.contributionsCollection?.totalCommitContributions || 0) +
                    (user.contributionsCollection?.restrictedContributionsCount || 0);

    const totalCount = user.pullRequests?.totalCount || 0;
    const allNodes = user.pullRequests?.nodes?.filter((pr: any) => pr != null) || [];
    const mergedCount = allNodes.filter((pr: any) => pr.mergedAt != null).length;

    const recentPRs = allNodes
      .filter((pr: any) => {
        const created = new Date(pr.createdAt);
        return created >= new Date(thirtyDaysAgo);
      })
      .map((pr: any) => ({
        title: pr.title,
        url: pr.url,
        mergedAt: pr.mergedAt,
        createdAt: pr.createdAt,
      }));

    const languageDistribution: Record<string, number> = {};
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

    return {
      commits,
      prs: totalCount,
      mergedPRs: mergedCount,
      languageDistribution,
      recentPRs,
    };
  } catch (error) {
    console.error('GitHub fetch error:', error);
    return { commits: 0, prs: 0, mergedPRs: 0, languageDistribution: {}, recentPRs: [] };
  }
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