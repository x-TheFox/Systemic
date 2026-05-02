import { generateSkillRadar } from '@/lib/ai/skillRadar';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const clerkId = searchParams.get('clerkId');
    const ghost = searchParams.get('ghost') === 'true';

    let dbUserId = userId;
    if (clerkId) {
      const user = await prisma.user.findUnique({ where: { clerkId } });
      if (!user) {
        return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
      }
      dbUserId = user.id;
    }

    if (!dbUserId) {
      return new Response(JSON.stringify({ error: 'userId or clerkId required' }), { status: 400 });
    }

    const radar = await generateSkillRadar(dbUserId);

    let ghostData = null;
    if (ghost) {
      const snapshot = await prisma.ghostSnapshot.findFirst({
        where: { userId: dbUserId },
        orderBy: { createdAt: 'desc' },
      });
      if (snapshot) {
        const breakdown = snapshot.skillBreakdown as Record<string, number> || {};
        const maxVal = Math.max(...Object.values(breakdown), 1);
        ghostData = Object.entries(breakdown).map(([subject, value]) => ({
          subject,
          ghost: Math.round((value / maxVal) * 150),
          fullMark: 150,
        }));
      }
    }

    return new Response(JSON.stringify({ radar, ghost: ghostData }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
