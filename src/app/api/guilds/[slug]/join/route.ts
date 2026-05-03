import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
      select: { id: true, guildId: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const guild = await prisma.guild.findUnique({
      where: { slug: params.slug },
    });

    if (!guild) {
      return NextResponse.json({ error: 'Guild not found' }, { status: 404 });
    }

    if (dbUser.guildId) {
      return NextResponse.json({ error: 'Already in a guild' }, { status: 409 });
    }

    if (!guild.isPublic) {
      return NextResponse.json({ error: 'This guild is invite-only' }, { status: 403 });
    }

    await prisma.user.update({
      where: { id: dbUser.id },
      data: { guildId: guild.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Guild join error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { slug: string } }) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
      select: { id: true, guildId: true },
    });

    if (!dbUser || !dbUser.guildId) {
      return NextResponse.json({ error: 'Not in a guild' }, { status: 400 });
    }

    const guild = await prisma.guild.findUnique({
      where: { slug: params.slug },
    });

    if (!guild || guild.id !== dbUser.guildId) {
      return NextResponse.json({ error: 'Guild mismatch' }, { status: 400 });
    }

    // If admin is leaving, delete the guild
    if (guild.adminId === dbUser.id) {
      await prisma.guild.delete({ where: { id: guild.id } });
      return NextResponse.json({ success: true, deleted: true });
    }

    await prisma.user.update({
      where: { id: dbUser.id },
      data: { guildId: null },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Guild leave error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
