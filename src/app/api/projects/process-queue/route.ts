import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { analyzeProject, pickBestProjects, summarizeProjectForBadges } from '@/lib/ai/projects';
import { fetchRepoTree, fetchRepoFile } from '@/lib/fetchers/github-repos';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get pending queue items
    const queue = await prisma.projectQueue.findMany({
      where: { status: 'pending' },
      take: 10, // Process in batches
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { githubHandle: true } } },
    });

    if (queue.length === 0) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    const processed = [];
    const summaries: string[] = [];

    for (const item of queue) {
      try {
        if (!item.user.githubHandle) {
          await prisma.projectQueue.update({
            where: { id: item.id },
            data: { status: 'failed', error: 'No githubHandle' },
          });
          continue;
        }

        // Parse owner/repo from URL
        const match = item.repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!match) {
          await prisma.projectQueue.update({
            where: { id: item.id },
            data: { status: 'failed', error: 'Invalid repo URL' },
          });
          continue;
        }

        const [, owner, repoName] = match;

        // Analyze project
        const card = await analyzeProject(owner, repoName, null, null, process.env.GITHUB_TOKEN);

        // Get file tree for summary
        const tree = await fetchRepoTree(owner, repoName, process.env.GITHUB_TOKEN);
        const selectedFiles = tree.slice(0, 5);
        const fileContents: Record<string, string> = {};
        for (const path of selectedFiles) {
          const content = await fetchRepoFile(owner, repoName, path, process.env.GITHUB_TOKEN);
          if (content) fileContents[path] = content.slice(0, 2000);
        }

        const summary = await summarizeProjectForBadges(repoName, card.description, tree, fileContents);
        summaries.push(summary);

        // Save project
        await prisma.project.create({
          data: {
            userId: item.userId,
            name: card.name,
            description: card.description,
            repoUrl: item.repoUrl,
            language: card.language || repoName.match(/\.(\w+)$/)?.[1] || null,
            stars: 0, // Will update later
            forks: 0,
            pinned: false,
            aiSummary: summary,
          },
        });

        // Mark queue as done
        await prisma.projectQueue.update({
          where: { id: item.id },
          data: { status: 'done' },
        });

        processed.push(item.repoName);
      } catch (err: any) {
        console.error(`Project queue failed for ${item.repoName}:`, err);
        await prisma.projectQueue.update({
          where: { id: item.id },
          data: { status: 'failed', error: err.message },
        });
      }
    }

    // After processing, pick best 3 to pin for each user
    const affectedUserIds = Array.from(new Set(queue.map((q) => q.userId)));
    for (const userId of affectedUserIds) {
      const userProjects = await prisma.project.findMany({
        where: { userId },
        select: { id: true, name: true, description: true, stars: true },
      });

      if (userProjects.length >= 3) {
        const bestNames = await pickBestProjects(userProjects.map((p) => ({
          name: p.name,
          description: p.description || '',
          rarity: 'common',
          stars: p.stars,
        })));

        // Unpin all first
        await prisma.project.updateMany({
          where: { userId },
          data: { pinned: false },
        });

        // Pin selected
        for (const name of bestNames) {
          const proj = userProjects.find((p) => p.name.toLowerCase() === name.toLowerCase());
          if (proj) {
            await prisma.project.update({
              where: { id: proj.id },
              data: { pinned: true },
            });
          }
        }
      }
    }

    // Feed summaries to badge queue
    if (summaries.length > 0) {
      for (const userId of affectedUserIds) {
        await prisma.badgeQueue.create({
          data: {
            userId,
            commits: summaries,
            isFirst: false,
            status: 'pending',
          },
        });
      }
    }

    return NextResponse.json({ success: true, processed: processed.length, projects: processed });
  } catch (error: any) {
    console.error('Project queue error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
