export interface RepoAnalysis {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  size: number;
  isFork: boolean;
  topics: string[];
  defaultBranch: string;
  diskUsage: number;
  createdAt: string;
  updatedAt: string;
  commitCount: number;
  languages: Record<string, number>;
  readmeSnippet: string;
  recentCommitMessages: string[];
  fileExtensions: string[];
}

export interface DeepDiveResult {
  user: {
    login: string;
    name: string | null;
    bio: string | null;
    publicRepos: number;
    followers: number;
    following: number;
    createdAt: string;
    avatarUrl: string;
  };
  repos: RepoAnalysis[];
  languageBreakdown: Record<string, number>;
  totalCommitEstimate: number;
  topicInterests: string[];
  skillSignals: {
    frontend: number;
    backend: number;
    devops: number;
    architecture: number;
    algo: number;
    mobile: number;
    dataScience: number;
    systems: number;
    security: number;
    testing: number;
  };
  dominantPath: string;
  filePathPatterns: Record<string, number>;
}

const GITHUB_GRAPHQL = 'https://api.github.com/graphql';
const GITHUB_REST = 'https://api.github.com';

async function graphqlRequest(query: string, variables: Record<string, unknown>, token: string) {
  const res = await fetch(GITHUB_GRAPHQL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GitHub GraphQL error: ${res.status}`);
  const data = await res.json();
  if (data.errors) throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
  return data.data;
}

async function _restRequest(path: string, token: string) {
  const res = await fetch(`${GITHUB_REST}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (!res.ok) throw new Error(`GitHub REST error: ${res.status} ${path}`);
  return res.json();
}

export async function deepDiveGitHub(handle: string, token: string): Promise<DeepDiveResult> {
  const userProfileQuery = `
    query($login: String!) {
      user(login: $login) {
        login
        name
        bio
        publicRepos
        followers {
          totalCount
        }
        following {
          totalCount
        }
        createdAt
        avatarUrl
        repositories(first: 100, isFork: false, ownerAffiliations: OWNER, orderBy: {field: UPDATED_AT, direction: DESC}) {
          totalCount
          nodes {
            name
            description
            primaryLanguage { name }
            stargazerCount
            forkCount
            isFork
            diskUsage
            createdAt
            updatedAt
            defaultBranchRef { name }
            url
            repositoryTopics(first: 20) {
              nodes { topic { name } }
            }
            languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
              edges {
                size
                node { name }
              }
            }
            defaultBranchRef {
              target {
                ... on Commit {
                  history(first: 15) {
                    totalCount
                    nodes {
                      message
                      committedDate
                      additions
                      deletions
                      changedFiles
                    }
                  }
                }
              }
            }
            object(expression: "HEAD:README.md") {
              ... on Blob {
                text
              }
            }
          }
        }
        contributionsCollection {
          totalCommitContributions
          restrictedContributionsCount
        }
      }
    }
  `;

  const data = await graphqlRequest(userProfileQuery, { login: handle }, token);
  const ghUser = data?.user;

  if (!ghUser) throw new Error(`GitHub user not found: ${handle}`);

  const repos: RepoAnalysis[] = [];
  const totalLanguages: Record<string, number> = {};
  const allTopics: string[] = [];
  const filePathPatterns: Record<string, number> = {};

  const skillSignals = {
    frontend: 0,
    backend: 0,
    devops: 0,
    architecture: 0,
    algo: 0,
    mobile: 0,
    dataScience: 0,
    systems: 0,
    security: 0,
    testing: 0,
  };

  const FRONTEND_KEYWORDS = ['react', 'vue', 'angular', 'svelte', 'next', 'nuxt', 'tailwind', 'css', 'html', 'dom', 'component', 'ui', 'frontend', 'styled', 'emotion', 'chakra', 'mui', 'radix', 'shadcn', 'storybook'];
  const BACKEND_KEYWORDS = ['api', 'server', 'express', 'django', 'flask', 'fastapi', 'rails', 'spring', 'database', 'sql', 'postgres', 'mongodb', 'redis', 'graphql', 'rest', 'grpc', 'microservice', 'backend'];
  const DEVOPS_KEYWORDS = ['docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'cicd', 'ci/cd', 'deploy', 'aws', 'gcp', 'azure', 'cloud', 'devops', 'helm', 'nginx', 'jenkins', 'github-actions'];
  const ARCHITECTURE_KEYWORDS = ['architecture', 'design-system', 'monorepo', 'system-design', 'scalab', 'distributed', 'event-driven', 'cqrs', 'ddd'];
  const ALGO_KEYWORDS = ['algorithm', 'leetcode', 'competitive', 'data-structure', 'graph', 'tree', 'dynamic-programming', 'sorting', 'search'];
  const MOBILE_KEYWORDS = ['ios', 'android', 'swift', 'kotlin', 'flutter', 'react-native', 'mobile', 'expo'];
  const DATA_SCIENCE_KEYWORDS = ['ml', 'machine-learning', 'ai', 'deep-learning', 'tensorflow', 'pytorch', 'jupyter', 'pandas', 'numpy', 'data-science', 'analytics'];
  const SYSTEMS_KEYWORDS = ['kernel', 'os', 'kernel-module', 'c', 'rust', 'systems', 'embedded', 'compiler', 'interpreter', 'wasm', 'llvm'];
  const SECURITY_KEYWORDS = ['security', 'crypto', 'auth', 'oauth', 'penetration', 'ctf', 'vulnerability'];
  const TESTING_KEYWORDS = ['test', 'testing', 'cypress', 'playwright', 'jest', 'vitest', 'e2e', 'integration-test'];

  const LANG_FRONTEND = new Set(['JavaScript', 'TypeScript', 'HTML', 'CSS', 'Svelte', 'Vue']);
  const LANG_BACKEND = new Set(['Python', 'Java', 'Go', 'Ruby', 'PHP', 'C#', 'Rust', 'Scala', 'Kotlin', 'Elixir']);
  const LANG_SYSTEMS = new Set(['C', 'C++', 'Rust', 'Assembly', 'Zig']);
  const LANG_DATA_SCIENCE = new Set(['Python', 'R', 'Julia', 'MATLAB']);
  const LANG_MOBILE = new Set(['Swift', 'Kotlin', 'Dart', 'Objective-C']);
  const FILE_EXT_FRONTEND: Record<string, number> = { '.tsx': 3, '.jsx': 3, '.vue': 3, '.svelte': 3, '.css': 2, '.scss': 2, '.html': 1 };
  const FILE_EXT_BACKEND: Record<string, number> = { '.py': 2, '.rb': 2, '.go': 2, '.java': 2, '.php': 2, '.rs': 2, '.cs': 2 };
  const FILE_EXT_DEVOPS: Record<string, number> = { '.yml': 2, '.yaml': 2, '.dockerfile': 3, '.tf': 3, '.hcl': 3 };

  for (const repo of ghUser.repositories.nodes) {
    const languages: Record<string, number> = {};
    repo.languages?.edges?.forEach((edge: any) => {
      const name = edge.node.name;
      const size = edge.size;
      languages[name] = size;
      totalLanguages[name] = (totalLanguages[name] || 0) + size;
    });

    const topics = repo.repositoryTopics?.nodes?.map((n: any) => n.topic?.name).filter(Boolean) || [];
    topics.forEach((t: string) => { if (!allTopics.includes(t)) allTopics.push(t); });

    const commitCount = repo.defaultBranchRef?.target?.history?.totalCount || 0;
    const recentCommitMessages = repo.defaultBranchRef?.target?.history?.nodes?.map((n: any) => n.message?.split('\n')[0]).filter(Boolean) || [];
    const readmeSnippet = repo.object?.text?.slice(0, 500) || '';

    const allKeywords = [
      repo.name.toLowerCase(),
      (repo.description || '').toLowerCase(),
      ...topics.map((t: string) => t.toLowerCase()),
      ...Object.keys(languages).map((l: string) => l.toLowerCase()),
      readmeSnippet.toLowerCase(),
      ...recentCommitMessages.map((m: string) => m.toLowerCase()),
    ].join(' ');

    const matchKeywords = (keywords: string[]) => keywords.some(k => allKeywords.includes(k));
    if (matchKeywords(FRONTEND_KEYWORDS)) skillSignals.frontend += 3;
    if (matchKeywords(BACKEND_KEYWORDS)) skillSignals.backend += 3;
    if (matchKeywords(DEVOPS_KEYWORDS)) skillSignals.devops += 3;
    if (matchKeywords(ARCHITECTURE_KEYWORDS)) skillSignals.architecture += 2;
    if (matchKeywords(ALGO_KEYWORDS)) skillSignals.algo += 2;
    if (matchKeywords(MOBILE_KEYWORDS)) skillSignals.mobile += 3;
    if (matchKeywords(DATA_SCIENCE_KEYWORDS)) skillSignals.dataScience += 3;
    if (matchKeywords(SYSTEMS_KEYWORDS)) skillSignals.systems += 3;
    if (matchKeywords(SECURITY_KEYWORDS)) skillSignals.security += 2;
    if (matchKeywords(TESTING_KEYWORDS)) skillSignals.testing += 2;

    for (const lang of Object.keys(languages)) {
      if (LANG_FRONTEND.has(lang)) skillSignals.frontend += 2;
      if (LANG_BACKEND.has(lang)) skillSignals.backend += 2;
      if (LANG_SYSTEMS.has(lang)) skillSignals.systems += 2;
      if (LANG_DATA_SCIENCE.has(lang)) skillSignals.dataScience += 1;
      if (LANG_MOBILE.has(lang)) skillSignals.mobile += 2;
    }

    const fileExtensions: string[] = [];
    const repoName = repo.name.toLowerCase();
    for (const [ext, signal] of Object.entries(FILE_EXT_FRONTEND)) {
      if (readmeSnippet.includes(ext) || recentCommitMessages.some((m: string) => m.includes(ext.slice(1)))) {
        skillSignals.frontend += signal;
        fileExtensions.push(ext);
      }
    }
    for (const [ext, signal] of Object.entries(FILE_EXT_BACKEND)) {
      if (readmeSnippet.includes(ext) || recentCommitMessages.some((m: string) => m.includes(ext.slice(1)))) {
        skillSignals.backend += signal;
        fileExtensions.push(ext);
      }
    }
    for (const [ext, signal] of Object.entries(FILE_EXT_DEVOPS)) {
      if (readmeSnippet.includes(ext) || recentCommitMessages.some((m: string) => m.includes(ext.slice(1)))) {
        skillSignals.devops += signal;
        fileExtensions.push(ext);
      }
    }

    if (repoName.includes('api') || repoName.includes('server') || repoName.includes('backend')) {
      skillSignals.backend += 2;
    }
    if (repoName.includes('ui') || repoName.includes('frontend') || repoName.includes('web')) {
      skillSignals.frontend += 2;
    }
    if (repoName.includes('cli') || repoName.includes('tool')) {
      skillSignals.architecture += 1;
    }
    if (repoName.includes('docker') || repoName.includes('infra') || repoName.includes('deploy')) {
      skillSignals.devops += 2;
    }
    if (repoName.includes('algo') || repoName.includes('leetcode') || repoName.includes('competitive')) {
      skillSignals.algo += 3;
    }
    if (repoName.includes('test') || repoName.includes('spec')) {
      skillSignals.testing += 2;
    }

    filePathPatterns[repo.name] = commitCount;

    repos.push({
      name: repo.name,
      description: repo.description,
      language: repo.primaryLanguage?.name || null,
      stars: repo.stargazerCount,
      forks: repo.forkCount,
      size: repo.diskUsage,
      isFork: repo.isFork,
      topics,
      defaultBranch: repo.defaultBranchRef?.name || 'main',
      diskUsage: repo.diskUsage,
      createdAt: repo.createdAt,
      updatedAt: repo.updatedAt,
      commitCount,
      languages,
      readmeSnippet,
      recentCommitMessages,
      fileExtensions: Array.from(new Set(fileExtensions)),
    });
  }

  const signalEntries = Object.entries(skillSignals) as [string, number][];
  const sorted = signalEntries.sort((a, b) => b[1] - a[1]);
  const dominantPath = getDominantPath(sorted);

  const totalCommitEstimate = ghUser.contributionsCollection.totalCommitContributions +
    ghUser.contributionsCollection.restrictedContributionsCount;

  return {
    user: {
      login: ghUser.login,
      name: ghUser.name,
      bio: ghUser.bio,
      publicRepos: ghUser.publicRepos,
      followers: ghUser.followers.totalCount,
      following: ghUser.following.totalCount,
      createdAt: ghUser.createdAt,
      avatarUrl: ghUser.avatarUrl,
    },
    repos: repos.sort((a, b) => b.commitCount - a.commitCount),
    languageBreakdown: totalLanguages,
    totalCommitEstimate,
    topicInterests: allTopics,
    skillSignals,
    dominantPath,
    filePathPatterns: Object.fromEntries(repos.map(r => [r.name, r.commitCount])),
  };
}

function getDominantPath(sorted: [string, number][]): string {
  const PATH_MAP: Record<string, string> = {
    frontend: 'Frontend Wizard',
    backend: 'Fullstack Legend',
    devops: 'DevOps Architect',
    architecture: 'Architecture Sage',
    algo: 'Algorithm Gladiator',
    mobile: 'Mobile Warrior',
    dataScience: 'Data Scientist',
    systems: 'Systems Engineer',
    security: 'Security Phantom',
    testing: 'Quality Enforcer',
  };

  if (sorted.length === 0 || sorted[0][1] === 0) return 'Core';
  return PATH_MAP[sorted[0][0]] || 'Core';
}

export async function fetchRepoReadme(owner: string, repo: string, token: string): Promise<string> {
  try {
    const res = await fetch(`${GITHUB_REST}/repos/${owner}/${repo}/readme`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3.raw',
      },
    });
    if (!res.ok) return '';
    const text = await res.text();
    return text.slice(0, 2000);
  } catch {
    return '';
  }
}

export async function fetchRepoFileTree(owner: string, repo: string, token: string, depth: number = 2): Promise<string[]> {
  try {
    const res = await fetch(`${GITHUB_REST}/repos/${owner}/${repo}/git/trees/main?recursive=${depth}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.tree || []).map((f: any) => f.path).filter(Boolean).slice(0, 200);
  } catch {
    return [];
  }
}