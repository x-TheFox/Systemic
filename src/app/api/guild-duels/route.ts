import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

// GET /api/guild-duels — list guild duels
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const guildId = searchParams.get('guildId');

    const where = guildId
      ? {
          OR: [
            { challengerGuildId: guildId },
            { opponentGuildId: guildId },
          ],
        }
      : {};

    const duels = await prisma.guildDuel.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        challengerGuild: { select: { id: true, name: true, slug: true, iconUrl: true } },
        opponentGuild: { select: { id: true, name: true, slug: true, iconUrl: true } },
      },
    });

    return NextResponse.json({ duels });
  } catch (error: any) {
    console.error('GuildDuels GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/guild-duels — challenge another guild
export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
      select: { id: true, guildId: true, name: true, githubHandle: true },
    });

    if (!dbUser || !dbUser.guildId) {
      return NextResponse.json({ error: 'You must be in a guild to challenge' }, { status: 400 });
    }

    const guild = await prisma.guild.findUnique({
      where: { id: dbUser.guildId },
      select: { id: true, adminId: true, name: true },
    });

    if (!guild) {
      return NextResponse.json({ error: 'Guild not found' }, { status: 404 });
    }

    if (guild.adminId !== dbUser.id) {
      return NextResponse.json({ error: 'Only guild admin can challenge' }, { status: 403 });
    }

    const body = await req.json();
    const { opponentGuildId } = body;

    if (!opponentGuildId) {
      return NextResponse.json({ error: 'opponentGuildId required' }, { status: 400 });
    }

    if (opponentGuildId === guild.id) {
      return NextResponse.json({ error: 'Cannot challenge your own guild' }, { status: 400 });
    }

    const opponentGuild = await prisma.guild.findUnique({
      where: { id: opponentGuildId },
      select: { id: true, adminId: true, name: true },
    });

    if (!opponentGuild) {
      return NextResponse.json({ error: 'Opponent guild not found' }, { status: 404 });
    }

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
    const year = now.getFullYear();

    // Check for existing pending/active duel between these guilds this week
    const existing = await prisma.guildDuel.findFirst({
      where: {
        weekNumber,
        year,
        OR: [
          { challengerGuildId: guild.id, opponentGuildId: opponentGuild.id },
          { challengerGuildId: opponentGuild.id, opponentGuildId: guild.id },
        ],
        status: { in: ['pending', 'active'] },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Guild duel already exists for this week' }, { status: 409 });
    }

    const duel = await prisma.guildDuel.create({
      data: {
        challengerGuildId: guild.id,
        opponentGuildId: opponentGuild.id,
        weekNumber,
        year,
        status: 'pending',
      },
    });

    // Send inbox message to opponent guild admin
    await prisma.inboxMessage.create({
      data: {
        userId: opponentGuild.adminId,
        type: 'guild_duel_request',
        title: 'Guild Duel Challenge!',
        body: `${guild.name} has challenged your guild to a weekly duel.`,
        metadata: { duelId: duel.id, challengerGuildId: guild.id, opponentGuildId: opponentGuild.id },
      },
    });

    return NextResponse.json({ success: true, duel });
  } catch (error: any) {
    console.error('Guild duel challenge error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
