import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');

    if (slug) {
      const guild = await prisma.guild.findUnique({
        where: { slug },
        include: {
          members: {
            select: {
              id: true,
              name: true,
              email: true,
              imageUrl: true,
              githubHandle: true,
              title: true,
              xp: true,
            },
            orderBy: { xp: 'desc' },
          },
          badges: true,
        },
      });

      if (!guild) {
        return NextResponse.json({ error: 'Guild not found' }, { status: 404 });
      }

      return NextResponse.json({ guild });
    }

    // List all public guilds
    const guilds = await prisma.guild.findMany({
      where: { isPublic: true },
      include: {
        members: { select: { id: true }, take: 0 },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ guilds });
  } catch (error: any) {
    console.error('Guilds GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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
    const { name, slug, description, isPublic = true } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'name and slug required' }, { status: 400 });
    }

    // Check if user already in a guild
    const existingUser = await prisma.user.findUnique({
      where: { id: dbUser.id },
      select: { guildId: true },
    });

    if (existingUser?.guildId) {
      return NextResponse.json({ error: 'Already in a guild. Leave first.' }, { status: 409 });
    }

    const guild = await prisma.guild.create({
      data: {
        name,
        slug: slug.toLowerCase(),
        description,
        iconUrl: body.iconUrl || null,
        isPublic,
        adminId: dbUser.id,
        members: { connect: { id: dbUser.id } },
      },
    });

    return NextResponse.json({ success: true, guild });
  } catch (error: any) {
    console.error('Guilds POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
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
    const slug = searchParams.get('slug');
    if (!slug) {
      return NextResponse.json({ error: 'slug required' }, { status: 400 });
    }

    const guild = await prisma.guild.findUnique({
      where: { slug },
      select: { id: true, adminId: true },
    });

    if (!guild) {
      return NextResponse.json({ error: 'Guild not found' }, { status: 404 });
    }

    if (guild.adminId !== dbUser.id) {
      return NextResponse.json({ error: 'Only admin can edit guild' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, iconUrl } = body;

    const updated = await prisma.guild.update({
      where: { id: guild.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(iconUrl !== undefined && { iconUrl: iconUrl || null }),
      },
    });

    return NextResponse.json({ success: true, guild: updated });
  } catch (error: any) {
    console.error('Guilds PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
