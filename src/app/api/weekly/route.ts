import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateWeeklyPostMortem } from '@/lib/ai/groq';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const logs = await prisma.activityLog.findMany({
      where: {
        timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      },
      include: { user: true }
    });

    const activityData = JSON.stringify(logs);
    const postMortem = await generateWeeklyPostMortem(activityData);

    // Normally we would push this to Discord/Slack or DB, here we just return it
    return NextResponse.json({ success: true, postMortem });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
