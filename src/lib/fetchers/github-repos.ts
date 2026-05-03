const GITHUB_REST = 'https://api.github.com';

export interface GitHubRepo {
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  pushed_at: string;
  fork: boolean;
  default_branch?: string;
}

export async function fetchGitHubRepos(handle: string, token?: string): Promise<GitHubRepo[]> {
  const authToken = token || process.env.GITHUB_TOKEN;
  if (!authToken) {
    console.warn('No GitHub token for repo fetch');
    return [];
  }

  const repos: GitHubRepo[] = [];
  let page = 1;
  const perPage = 100;

  while (page <= 3) { // Max 300 repos
    const res = await fetch(
      `${GITHUB_REST}/users/${handle}/repos?type=owner&sort=updated&per_page=${perPage}&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!res.ok) {
      console.warn(`GitHub repos fetch failed: ${res.status}`);
      break;
    }

    const data = await res.json() as GitHubRepo[];
    repos.push(...data);
    if (data.length < perPage) break;
    page++;
  }

  return repos;
}

export async function fetchRepoTree(owner: string, repo: string, token?: string): Promise<string[]> {
  const authToken = token || process.env.GITHUB_TOKEN;
  if (!authToken) return [];

  try {
    const res = await fetch(
      `${GITHUB_REST}/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!res.ok) return [];
    const data = await res.json();
    return (data.tree || [])
      .filter((item: any) => item.type === 'blob')
      .map((item: any) => item.path)
      .filter((path: string) => {
        // Skip common non-source files
        const skip = ['node_modules/', 'vendor/', '.git/', 'dist/', 'build/', 'coverage/',
          'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', '.DS_Store'];
        return !skip.some((s) => path.includes(s));
      });
  } catch {
    return [];
  }
}

export async function fetchRepoFile(owner: string, repo: string, path: string, token?: string): Promise<string | null> {
  const authToken = token || process.env.GITHUB_TOKEN;
  if (!authToken) return null;

  try {
    const res = await fetch(
      `${GITHUB_REST}/repos/${owner}/${repo}/contents/${path}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    if (data.content) {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    return null;
  } catch {
    return null;
  }
}

export interface ForkStatus {
  isFork: boolean;
  hasContribution: boolean;
  aheadBy: number;
  parentFullName: string | null;
}

export async function checkForkContribution(owner: string, repo: string, token?: string): Promise<ForkStatus> {
  const authToken = token || process.env.GITHUB_TOKEN;
  if (!authToken) {
    return { isFork: false, hasContribution: true, aheadBy: 0, parentFullName: null };
  }

  try {
    // Get repo details to check if it's a fork and find parent
    const repoRes = await fetch(`${GITHUB_REST}/repos/${owner}/${repo}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!repoRes.ok) {
      return { isFork: false, hasContribution: true, aheadBy: 0, parentFullName: null };
    }

    const repoData = await repoRes.json();
    if (!repoData.fork) {
      return { isFork: false, hasContribution: true, aheadBy: 0, parentFullName: null };
    }

    const parent = repoData.parent;
    if (!parent) {
      return { isFork: true, hasContribution: true, aheadBy: 0, parentFullName: null };
    }

    // Compare fork's default branch with parent's default branch
    const forkBranch = repoData.default_branch || 'master';
    const parentBranch = parent.default_branch || 'master';
    const compareUrl = `${GITHUB_REST}/repos/${owner}/${repo}/compare/${parent.owner.login}:${parentBranch}...${owner}:${forkBranch}`;

    const compareRes = await fetch(compareUrl, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!compareRes.ok) {
      // Compare API failed — err on side of including, but warn
      console.warn(`[ForkCheck] Compare API failed for ${owner}/${repo}, assuming fork has contributions`);
      return { isFork: true, hasContribution: true, aheadBy: 0, parentFullName: parent.full_name };
    }

    const compareData = await compareRes.json();
    const aheadBy = compareData.ahead_by || 0;

    return {
      isFork: true,
      hasContribution: aheadBy > 0,
      aheadBy,
      parentFullName: parent.full_name,
    };
  } catch (err: any) {
    console.warn(`[ForkCheck] Error checking ${owner}/${repo}:`, err.message);
    return { isFork: false, hasContribution: true, aheadBy: 0, parentFullName: null };
  }
}
