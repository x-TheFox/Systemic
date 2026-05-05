import { z } from 'zod';
import { groqGenerateObject } from './groq-models';
import { fetchRepoTree, fetchRepoFile } from '@/lib/fetchers/github-repos';

// Accepts both raw arrays and {files: [...]} wrapper objects
const FileListSchema = z.union([
  z.array(z.string()),
  z.object({ files: z.array(z.string()) }).transform((o) => o.files),
  z.object({ fileList: z.array(z.string()) }).transform((o) => o.fileList),
  z.object({ selectedFiles: z.array(z.string()) }).transform((o) => o.selectedFiles),
]);

const ProjectCardSchema = z.object({
  name: z.string().describe('Project name, max 30 chars'),
  description: z.string().describe('One compelling sentence about what it does, max 100 chars'),
  rarity: z.enum(['common', 'rare', 'epic', 'legendary'])
    .describe('Based on complexity, uniqueness, and polish'),
  xpValue: z.number().describe('XP value this project grants the owner. Scale: common=50-150, rare=200-400, epic=500-1000, legendary=1200-3000. Based on scope, technical depth, real-world impact, and code quality.'),
  icon: z.string().describe('A lucide-react icon name (e.g. Database, Globe, Terminal, Cpu, Layers, Box, Code2, GitBranch, Server, Shield)'),
  language: z.string().describe('Primary programming language'),
});

const BestProjectsSchema = z.array(z.string());

const SummarySchema = z.object({
  summary: z.string().describe('2-3 sentence summary of the project'),
});

interface ProjectCard {
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xpValue: number;
  icon: string;
  language: string;
}

export async function analyzeProject(
  owner: string,
  repoName: string,
  repoDescription: string | null,
  repoLanguage: string | null,
  token?: string,
  forkInfo?: { isFork: boolean; aheadBy: number; parentFullName: string | null }
): Promise<ProjectCard> {
  // Step 1: Get file tree
  const tree = await fetchRepoTree(owner, repoName, token);
  const truncatedTree = tree.slice(0, 200);

  // Build fork context for the LLM
  const forkContext = forkInfo?.isFork
    ? `\nFORK STATUS: This is a fork of ${forkInfo.parentFullName || 'an upstream repo'}. It has ${forkInfo.aheadBy} unique commits ahead of upstream.`
    : '';

  // Step 2: Ask LLM which files to read
  const fileSelectionPrompt = `You are analyzing a GitHub repository. Here is the file tree (first 200 files):

Repo: ${repoName}
Description: ${repoDescription || 'N/A'}
Language: ${repoLanguage || 'Unknown'}${forkContext}

Files:
${truncatedTree.join('\n')}

List the 5-10 most important files to read to understand what this project does.`;

  const selectedFiles = await groqGenerateObject(
    FileListSchema,
    fileSelectionPrompt,
    ["README.md"] // fallback: every repo has a README
  );
  const filesToRead = selectedFiles.slice(0, 10);

  // Step 3: Fetch selected files
  const fileContents: Record<string, string> = {};
  for (const path of filesToRead) {
    const content = await fetchRepoFile(owner, repoName, path, token);
    if (content) {
      fileContents[path] = content.length > 8000
        ? content.slice(0, 4000) + '\n\n[... content truncated ...]\n\n' + content.slice(-4000)
        : content;
    }
  }

  // Step 4: Ask LLM for project card
  const filesContext = Object.entries(fileContents)
    .map(([path, content]) => `--- ${path} ---\n${content.slice(0, 3000)}`)
    .join('\n\n');

  const cardPrompt = `You are a brutal but fair project evaluator for an elite developer guild. Rate this repository HONESTLY - most developers underrate their own work, so YOU must compensate.

Repo: ${repoName}
Description: ${repoDescription || 'N/A'}
Language: ${repoLanguage || 'Unknown'}${forkContext}

Key files:
${filesContext}

RARITY RUBRIC - be GENEROUS. When in doubt, rank UP:
• common: Toy scripts, hello-world tutorials, config repos, single-file utilities
• rare: Solid personal tools, CLI apps, simple CRUD apps, basic libraries
• epic: Production-grade apps with multiple features, good architecture, tests, auth, databases, APIs
• legendary: ANY of the following - distributed systems, real-time features (WebSockets/Pusher), AI/LLM integration, multi-user platforms, payment systems, complex state management, microservices, competitive/gamified systems, open-source with community usage, full-stack with 5+ integrated services. IF it has a database + auth + real-time + AI + multiple user flows, it is LEGENDARY. Period.

XP VALUE RUBRIC - DO NOT be stingy:
• common: 50-150 XP
• rare: 200-500 XP
• epic: 600-1500 XP
• legendary: 2000-5000 XP (complex full-stack platforms deserve 3000+, distributed systems 4000+)

Generate a project card with:
- name: project name (max 30 chars)
- description: one compelling sentence about what it does (max 100 chars)
- rarity: common | rare | epic | legendary (use the rubric above, BE GENEROUS)
- xpValue: XP value based on rarity rubric
- icon: a lucide-react icon name
- language: primary programming language`;


  const defaultCard: z.infer<typeof ProjectCardSchema> = {
    name: repoName.slice(0, 30),
    description: repoDescription || `A project by ${owner}.`,
    rarity: 'common',
    xpValue: 75,
    icon: 'Code2',
    language: repoLanguage || 'Unknown',
  };

  const card = await groqGenerateObject(ProjectCardSchema, cardPrompt, defaultCard);

  return {
    name: card.name.slice(0, 30),
    description: card.description.slice(0, 100),
    rarity: card.rarity,
    xpValue: Math.max(25, Math.min(6000, Math.round(card.xpValue))),
    icon: card.icon,
    language: card.language,
  };
}

export async function pickBestProjects(
  projects: Array<{ name: string; description: string; rarity: string; stars: number }>
): Promise<string[]> {
  const prompt = `Pick the best 3 projects to showcase on a developer profile. Consider: impact, complexity, stars, and uniqueness.

Projects:
${projects.map((p) => `- ${p.name} (${p.rarity}, ${p.stars} stars): ${p.description}`).join('\n')}

Return ONLY a JSON array of the 3 project names to pin.`;

  const fallbackNames = projects.slice(0, 3).map((p) => p.name);
  const bestNames = await groqGenerateObject(BestProjectsSchema, prompt, fallbackNames);
  return bestNames.slice(0, 3);
}

export async function summarizeProjectForBadges(
  repoName: string,
  description: string,
  fileTree: string[],
  fileContents: Record<string, string>
): Promise<string> {
  const filesContext = Object.entries(fileContents)
    .map(([path, content]) => `--- ${path} ---\n${content.slice(0, 2000)}`)
    .join('\n\n');

  const prompt = `Summarize this project for a developer's badge/title generation system.

Repo: ${repoName}
Description: ${description}

Key files:
${filesContext}

Write a 2-3 sentence summary focusing on: what problem it solves, technical sophistication, and impact.`;

  const fallbackSummary: z.infer<typeof SummarySchema> = {
    summary: description || `A project named ${repoName}.`,
  };

  const result = await groqGenerateObject(SummarySchema, prompt, fallbackSummary);
  return result.summary;
}
