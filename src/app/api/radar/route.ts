import { generateSkillRadar } from '@/lib/ai/skillRadar';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId required' }), { status: 400 });
    }

    const radar = await generateSkillRadar(userId);
    return new Response(JSON.stringify({ radar }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
