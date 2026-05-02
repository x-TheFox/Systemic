import { generateSkillRadar } from '@/lib/ai/skillRadar';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const ghost = searchParams.get('ghost') === 'true';

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId required' }), { status: 400 });
    }

    const radar = await generateSkillRadar(userId);

    let ghostData = null;
    if (ghost) {
      const snapshot = await prisma.ghostSnapshot.findFirst({
        where: { userId },
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