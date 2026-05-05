import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';
import { encrypt } from '@/lib/crypto';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// GET /api/donated-keys - list user's donated keys (masked)
export async function GET(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
      select: { id: true },
    });
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const keys = await prisma.donatedKey.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        provider: true,
        isActive: true,
        useCount: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ keys });
  } catch (error: any) {
    console.error('DonatedKeys GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/donated-keys - submit a new key
export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
      select: { id: true },
    });
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { apiKey, provider = 'groq' } = body;

    if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 400 });
    }

    // Validate key format (Groq keys start with gsk_)
    if (provider === 'groq' && !apiKey.startsWith('gsk_')) {
      return NextResponse.json(
        { error: 'Invalid Groq API key format. Must start with "gsk_"' },
        { status: 400 }
      );
    }

    // Hash for quick verification without decryption
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Check for duplicate (same user + same hash)
    const existing = await prisma.donatedKey.findFirst({
      where: { userId: dbUser.id, keyHash },
    });
    if (existing) {
      return NextResponse.json({ error: 'You have already donated this key' }, { status: 409 });
    }

    // Encrypt the key
    const keyCipher = encrypt(apiKey);

    const donated = await prisma.donatedKey.create({
      data: {
        userId: dbUser.id,
        provider,
        keyHash,
        keyCipher,
      },
    });

    return NextResponse.json({
      success: true,
      key: {
        id: donated.id,
        provider: donated.provider,
        isActive: donated.isActive,
        useCount: donated.useCount,
        createdAt: donated.createdAt,
      },
    });
  } catch (error: any) {
    console.error('DonatedKeys POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/donated-keys?id=xxx - revoke a key
export async function DELETE(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
      select: { id: true },
    });
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const key = await prisma.donatedKey.findFirst({
      where: { id, userId: dbUser.id },
    });
    if (!key) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    await prisma.donatedKey.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DonatedKeys DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
