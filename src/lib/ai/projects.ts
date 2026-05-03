import { generateObject } from 'ai';
import { groq } from '@ai-sdk/groq';
import { nextModel } from './groq-models';
import { fetchRepoTree, fetchRepoFile } from '@/lib/fetchers/github-repos';

interface ProjectCard {
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon: string; // lucide icon name
  language: string;
}

export async function analyzeProject(
  owner: string,
  repoName: string,
  repoDescription: string | null,
  repoLanguage: string | null,
  token?: string
): Promise<ProjectCard> {
  const model = nextModel();

  // Step 1: Get file tree
  const tree = await fetchRepoTree(owner, repoName, token);
  const truncatedTree = tree.slice(0, 200); // Limit tree size

  // Step 2: Ask LLM which files to read
  const fileSelectionPrompt = `You are analyzing a GitHub repository. Here is the file tree (first 200 files):

Repo: ${repoName}
Description: ${repoDescription || 'N/A'}
Language: ${repoLanguage || 'Unknown'}

Files:
${truncatedTree.join('\n')}

List the 5-10 most important files to read to understand what this project does. Return ONLY a JSON array of file paths. Example: ["README.md", "src/main.ts", "package.json"]`;

  const fileRes = await generateObject({
    model: groq(model),
    prompt: fileSelectionPrompt,
    schema: { type: 'array', items: { type: 'string' } } as any,
  });

  const selectedFiles: string[] = (fileRes.object as string[]).slice(0, 10);

  // Step 3: Fetch selected files
  const fileContents: Record<string, string> = {};
  for (const path of selectedFiles) {
    const content = await fetchRepoFile(owner, repoName, path, token);
    if (content) {
      // Truncate large files
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
Language: ${repoLanguage || 'Unknown'}

Key files:
${filesContext}

Generate a project card with:
- name: project name (max 30 chars)
- description: one compelling sentence about what it does (max 100 chars)
- rarity: common | rare | epic | legendary (based on complexity, uniqueness, and polish)
- icon: a lucide-react icon name that represents this project type (e.g., "Database", "Globe", "Terminal", "Cpu", "Layers", "Box", "Code2", "GitBranch", "Server", "Shield")
- language: primary programming language

Return as JSON: {"name": "...", "description": "...", "rarity": "...", "icon": "...", "language": "..."}`;

  const cardRes = await generateObject({
    model: groq(model),
    prompt: cardPrompt,
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        rarity: { type: 'string', enum: ['common', 'rare', 'epic', 'legendary'] },
        icon: { type: 'string' },
        language: { type: 'string' },
      },
      required: ['name', 'description', 'rarity', 'icon', 'language'],
    } as any,
  });

  return cardRes.object as ProjectCard;
}

export async function pickBestProjects(
  projects: Array<{ name: string; description: string; rarity: string; stars: number }>
): Promise<string[]> {
  const model = nextModel();

  const prompt = `Pick the best 3 projects to showcase on a developer profile. Consider: impact, complexity, stars, and uniqueness.

Projects:
${projects.map((p) => `- ${p.name} (${p.rarity}, ${p.stars} stars): ${p.description}`).join('\n')}

Return ONLY a JSON array of the 3 project names to pin. Example: ["project-a", "project-b", "project-c"]`;

  const res = await generateObject({
    model: groq(model),
    prompt,
    schema: { type: 'array', items: { type: 'string' } } as any,
  });

  return (res.object as string[]).slice(0, 3);
}

export async function summarizeProjectForBadges(
  repoName: string,
  description: string,
  fileTree: string[],
  fileContents: Record<string, string>
): Promise<string> {
  const model = nextModel();

  const filesContext = Object.entries(fileContents)
    .map(([path, content]) => `--- ${path} ---\n${content.slice(0, 2000)}`)
    .join('\n\n');

  const prompt = `Summarize this project for a developer's badge/title generation system.

Repo: ${repoName}
Description: ${description}

Key files:
${filesContext}

Write a 2-3 sentence summary focusing on: what problem it solves, technical sophistication, and impact.`;

  const res = await generateObject({
    model: groq(model),
    prompt,
    schema: { type: 'object', properties: { summary: { type: 'string' } }, required: ['summary'] } as any,
  });

  return (res.object as any).summary || '';
}
