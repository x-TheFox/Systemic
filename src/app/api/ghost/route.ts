import { NextResponse } from 'next/server';
import { getGhostSnapshots } from '@/lib/ai/ghost';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const snapshots = await getGhostSnapshots(userId);
    return NextResponse.json({ snapshots });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
