import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

export const dynamic = 'force-dynamic';

/**
 * GET /api/donated-keys/active
 * Returns all active donated Groq keys, decrypted.
 * Protected by CRON_SECRET — only internal services should call this.
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const keys = await prisma.donatedKey.findMany({
      where: { provider: 'groq', isActive: true },
      select: {
        id: true,
        keyCipher: true,
        useCount: true,
        lastUsedAt: true,
      },
      orderBy: { useCount: 'asc' }, // least-used first for load balancing
    });

    const decrypted = keys.map((k) => ({
      id: k.id,
      key: decrypt(k.keyCipher),
      useCount: k.useCount,
      lastUsedAt: k.lastUsedAt,
    }));

    return NextResponse.json({ keys: decrypted, count: decrypted.length });
  } catch (error: any) {
    console.error('Active keys fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/donated-keys/active
 * Increment use count for a key (called after successful LLM request).
 * Body: { keyId }
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { keyId } = body;

    if (!keyId) {
      return NextResponse.json({ error: 'keyId required' }, { status: 400 });
    }

    await prisma.donatedKey.update({
      where: { id: keyId },
      data: {
        useCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Key usage update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
