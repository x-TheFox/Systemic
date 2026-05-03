import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { analyzeProject, pickBestProjects, summarizeProjectForBadges } from '@/lib/ai/projects';
import { fetchRepoTree, fetchRepoFile, checkForkContribution } from '@/lib/fetchers/github-repos';

export const dynamic = 'force-dynamic';

// GET: Return pending project count
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pendingCount = await prisma.projectQueue.count({
      where: { status: 'pending' },
    });

    return NextResponse.json({ pending: pendingCount });
  } catch (error: any) {
    console.error('Project queue GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Process project queue
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const count = Math.min(parseInt(searchParams.get('count') || '1'), 5);
    const finalize = searchParams.get('finalize') === 'true';

    // If finalize mode: just do pinning + badge queue feeding for users with unprocessed summaries
    if (finalize) {
      return await finalizeProjects();
    }

    // Get pending queue items (process 1 by default, max 5)
    const queue = await prisma.projectQueue.findMany({
      where: { status: 'pending' },
      take: count,
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { githubHandle: true } } },
    });

    if (queue.length === 0) {
      return NextResponse.json({ success: true, processed: 0, remaining: 0 });
    }

    const processed = [];

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

        // Check fork status for LLM context
        const forkStatus = await checkForkContribution(owner, repoName, process.env.GITHUB_TOKEN);

        // Analyze project (pass fork info so LLM knows context)
        const card = await analyzeProject(
          owner,
          repoName,
          null,
          null,
          process.env.GITHUB_TOKEN,
          forkStatus.isFork
            ? {
                isFork: forkStatus.isFork,
                aheadBy: forkStatus.aheadBy,
                parentFullName: forkStatus.parentFullName,
              }
            : undefined
        );

        // Get file tree for summary
        const tree = await fetchRepoTree(owner, repoName, process.env.GITHUB_TOKEN);
        const selectedFiles = tree.slice(0, 5);
        const fileContents: Record<string, string> = {};
        for (const path of selectedFiles) {
          const content = await fetchRepoFile(owner, repoName, path, process.env.GITHUB_TOKEN);
          if (content) fileContents[path] = content.slice(0, 2000);
        }

        const summary = await summarizeProjectForBadges(repoName, card.description, tree, fileContents);

        // Save project
        await prisma.project.create({
          data: {
            userId: item.userId,
            name: card.name,
            description: card.description,
            repoUrl: item.repoUrl,
            language: card.language || repoName.match(/\.(\w+)$/)?.[1] || null,
            stars: 0,
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

    const remaining = await prisma.projectQueue.count({
      where: { status: 'pending' },
    });

    return NextResponse.json({ success: true, processed: processed.length, projects: processed, remaining });
  } catch (error: any) {
    console.error('Project queue error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function finalizeProjects() {
  try {
    // Find all users who have projects that were just processed
    const affectedUsers = await prisma.project.findMany({
      distinct: ['userId'],
      select: { userId: true },
    });

    const pinnedCount = { total: 0 };
    const badgeQueued = { total: 0 };

    for (const { userId } of affectedUsers) {
      const userProjects = await prisma.project.findMany({
        where: { userId },
        select: { id: true, name: true, description: true, stars: true, aiSummary: true },
      });

      if (userProjects.length >= 3) {
        // Pick best 3 to pin
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
            pinnedCount.total++;
          }
        }
      }

      // Feed summaries to badge queue
      const summaries = userProjects.map((p) => p.aiSummary).filter(Boolean) as string[];
      if (summaries.length > 0) {
        await prisma.badgeQueue.create({
          data: {
            userId,
            commits: summaries,
            isFirst: false,
            status: 'pending',
          },
        });
        badgeQueued.total++;
      }
    }

    return NextResponse.json({
      success: true,
      finalized: true,
      usersAffected: affectedUsers.length,
      pinned: pinnedCount.total,
      badgeQueues: badgeQueued.total,
    });
  } catch (error: any) {
    console.error('Project finalize error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
