import { z } from 'zod';
import { groqGenerateObject } from './groq-models';
import { fetchRepoTree, fetchRepoFile } from '@/lib/fetchers/github-repos';

const FileListSchema = z.array(z.string());

const ProjectCardSchema = z.object({
  name: z.string().describe('Project name, max 30 chars'),
  description: z.string().describe('One compelling sentence about what it does, max 100 chars'),
  rarity: z.enum(['common', 'rare', 'epic', 'legendary'])
    .describe('Based on complexity, uniqueness, and polish'),
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

  const cardPrompt = `Analyze this GitHub repository and generate a project card.

Repo: ${repoName}
Description: ${repoDescription || 'N/A'}
Language: ${repoLanguage || 'Unknown'}${forkContext}

Key files:
${filesContext}

Generate a project card with:
- name: project name (max 30 chars)
- description: one compelling sentence about what it does (max 100 chars)
- rarity: common | rare | epic | legendary (based on complexity, uniqueness, and polish)
- icon: a lucide-react icon name that represents this project type
- language: primary programming language`;

  const defaultCard: z.infer<typeof ProjectCardSchema> = {
    name: repoName.slice(0, 30),
    description: repoDescription || `A project by ${owner}.`,
    rarity: 'common',
    icon: 'Code2',
    language: repoLanguage || 'Unknown',
  };

  const card = await groqGenerateObject(ProjectCardSchema, cardPrompt, defaultCard);

  return {
    name: card.name.slice(0, 30),
    description: card.description.slice(0, 100),
    rarity: card.rarity,
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
