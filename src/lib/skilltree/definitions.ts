export interface SkillNode {
  id: string;
  name: string;
  description: string;
  path: 'Frontend Wizard' | 'Systems Engineer' | 'Data Scientist' | 'Core';
  tier: number; // 0 = root, 1, 2, 3...
  position: { x: number; y: number };
  requirements: NodeRequirement[];
  xpReward: number;
  icon?: string;
}

export interface NodeRequirement {
  type: 'leetcode_difficulty' | 'leetcode_hard' | 'leetcode_tags' | 'github_prs' | 'github_commits' | 'codeforces_rating' | 'codeforces_solved' | 'hackerrank_badges' | 'total_xp' | 'skill_xp';
  value: number;
  tags?: string[];
  platform?: string;
}

export const SKILL_PATHS = [
  { id: 'frontend-wizard', name: 'Frontend Wizard', color: '#3b82f6' },
  { id: 'systems-engineer', name: 'Systems Engineer', color: '#ef4444' },
  { id: 'data-scientist', name: 'Data Scientist', color: '#22c55e' },
] as const;

export const SKILL_TREE_NODES: SkillNode[] = [
  // Core
  {
    id: 'core-junior-dev',
    name: 'Junior Dev',
    description: 'Welcome to the grind. Every legend starts here.',
    path: 'Core',
    tier: 0,
    position: { x: 400, y: 0 },
    requirements: [{ type: 'total_xp', value: 0 }],
    xpReward: 0,
  },
  
  // Frontend Wizard Path
  {
    id: 'fw-dom-surgeon',
    name: 'DOM Surgeon',
    description: 'Master the art of DOM manipulation.',
    path: 'Frontend Wizard',
    tier: 1,
    position: { x: 200, y: 150 },
    requirements: [
      { type: 'skill_xp', value: 50, platform: 'Frontend' },
    ],
    xpReward: 100,
  },
  {
    id: 'fw-react-artisan',
    name: 'React Artisan',
    description: 'Build 5 complex React components with hooks and context.',
    path: 'Frontend Wizard',
    tier: 2,
    position: { x: 200, y: 300 },
    requirements: [
      { type: 'skill_xp', value: 150, platform: 'Frontend' },
      { type: 'github_prs', value: 3, tags: ['frontend', 'react'] },
    ],
    xpReward: 250,
  },
  {
    id: 'fw-fullstack-legend',
    name: 'Fullstack Legend',
    description: 'Conquer both frontend and backend.',
    path: 'Frontend Wizard',
    tier: 3,
    position: { x: 200, y: 450 },
    requirements: [
      { type: 'skill_xp', value: 400, platform: 'Frontend' },
      { type: 'skill_xp', value: 200, platform: 'Backend' },
      { type: 'total_xp', value: 500 },
    ],
    xpReward: 500,
  },

  // Systems Engineer Path
  {
    id: 'se-concurrency-master',
    name: 'Concurrency Master',
    description: 'Solve 5 Hard OS-related problems on LeetCode.',
    path: 'Systems Engineer',
    tier: 1,
    position: { x: 400, y: 150 },
    requirements: [
      { type: 'leetcode_tags', value: 5, tags: ['Concurrency', 'Operating System'] },
      { type: 'leetcode_difficulty', value: 5 },
    ],
    xpReward: 150,
  },
  {
    id: 'se-kernel-whisperer',
    name: 'Kernel Whisperer',
    description: 'Deep understanding of low-level systems.',
    path: 'Systems Engineer',
    tier: 2,
    position: { x: 400, y: 300 },
    requirements: [
      { type: 'skill_xp', value: 200, platform: 'Backend' },
      { type: 'leetcode_hard', value: 10 },
    ],
    xpReward: 300,
  },
  {
    id: 'se-distributed-architect',
    name: 'Distributed Architect',
    description: 'Design and implement distributed systems.',
    path: 'Systems Engineer',
    tier: 3,
    position: { x: 400, y: 450 },
    requirements: [
      { type: 'skill_xp', value: 300, platform: 'Architecture' },
      { type: 'github_prs', value: 10, tags: ['architecture', 'distributed'] },
      { type: 'total_xp', value: 800 },
    ],
    xpReward: 600,
  },

  // Data Scientist Path
  {
    id: 'ds-sql-sage',
    name: 'SQL Sage',
    description: 'Solve 30 database-related problems.',
    path: 'Data Scientist',
    tier: 1,
    position: { x: 600, y: 150 },
    requirements: [
      { type: 'leetcode_tags', value: 30, tags: ['Database'] },
    ],
    xpReward: 120,
  },
  {
    id: 'ds-ml-practitioner',
    name: 'ML Practitioner',
    description: 'Earn HackerRank ML Badge or solve 20 ML problems.',
    path: 'Data Scientist',
    tier: 2,
    position: { x: 600, y: 300 },
    requirements: [
      { type: 'hackerrank_badges', value: 1 },
      { type: 'skill_xp', value: 150, platform: 'Algo' },
    ],
    xpReward: 280,
  },
  {
    id: 'ds-pipeline-prophet',
    name: 'Pipeline Prophet',
    description: 'Master data pipelines and DevOps.',
    path: 'Data Scientist',
    tier: 3,
    position: { x: 600, y: 450 },
    requirements: [
      { type: 'skill_xp', value: 150, platform: 'DevOps' },
      { type: 'github_prs', value: 5, tags: ['data', 'pipeline'] },
      { type: 'total_xp', value: 600 },
    ],
    xpReward: 550,
  },

  // Ultimate
  {
    id: 'ultimate-architect',
    name: 'The Architect',
    description: 'You have transcended. 1000 XP across any path.',
    path: 'Core',
    tier: 4,
    position: { x: 400, y: 600 },
    requirements: [
      { type: 'total_xp', value: 1000 },
    ],
    xpReward: 1000,
  },
];

export const SKILL_TREE_EDGES = [
  { id: 'e-core-frontend', source: 'core-junior-dev', target: 'fw-dom-surgeon' },
  { id: 'e-core-systems', source: 'core-junior-dev', target: 'se-concurrency-master' },
  { id: 'e-core-data', source: 'core-junior-dev', target: 'ds-sql-sage' },
  
  { id: 'e-fw-1', source: 'fw-dom-surgeon', target: 'fw-react-artisan' },
  { id: 'e-fw-2', source: 'fw-react-artisan', target: 'fw-fullstack-legend' },
  
  { id: 'e-se-1', source: 'se-concurrency-master', target: 'se-kernel-whisperer' },
  { id: 'e-se-2', source: 'se-kernel-whisperer', target: 'se-distributed-architect' },
  
  { id: 'e-ds-1', source: 'ds-sql-sage', target: 'ds-ml-practitioner' },
  { id: 'e-ds-2', source: 'ds-ml-practitioner', target: 'ds-pipeline-prophet' },
  
  { id: 'e-ultimate-1', source: 'fw-fullstack-legend', target: 'ultimate-architect' },
  { id: 'e-ultimate-2', source: 'se-distributed-architect', target: 'ultimate-architect' },
  { id: 'e-ultimate-3', source: 'ds-pipeline-prophet', target: 'ultimate-architect' },
];
