import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchGitHubMetrics } from '@/lib/fetchers/github';
import { fetchLeetCodeMetrics } from '@/lib/fetchers/leetcode';

export async function POST(req: Request) {
  try {
    // Authenticate GitHub Actions request (e.g., via a secret token)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await prisma.user.findMany();

    for (const user of users) {
      if (user.githubHandle) {
        const ghMetrics = await fetchGitHubMetrics(user.githubHandle);
        // Create activity logs and calculate XP...
      }
      if (user.leetcodeHandle) {
        const lcMetrics = await fetchLeetCodeMetrics(user.leetcodeHandle);
        // Create activity logs...
      }
    }

    return NextResponse.json({ success: true, processedUsers: users.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
