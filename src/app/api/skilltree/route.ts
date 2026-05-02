import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';

async function getOrCreateUser(clerkId: string, email: string, name: string | null, imageUrl: string | null) {
  return prisma.user.upsert({
    where: { clerkId },
    update: { email, name, imageUrl },
    create: {
      clerkId,
      email,
      name,
      imageUrl,
      skillTreeState: { create: { unlockedNodes: [], currentGrind: null } },
    },
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get('userId');
    const clerkIdParam = searchParams.get('clerkId');

    let userId = userIdParam;

    if (clerkIdParam) {
      const dbUser = await prisma.user.findUnique({ where: { clerkId: clerkIdParam } });
      if (!dbUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      userId = dbUser.id;
    } else if (!userId) {
      const clerkUser = await currentUser();
      if (!clerkUser) {
        return NextResponse.json({ error: 'userId or clerkId required, or sign in' }, { status: 400 });
      }

      const dbUser = await getOrCreateUser(
        clerkUser.id,
        clerkUser.emailAddresses[0]?.emailAddress || `${clerkUser.id}@systemics.app`,
        `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || null,
        clerkUser.imageUrl
      );
      userId = dbUser.id;
    }

    const nodes = await prisma.dynamicSkillNode.findMany({
      where: { userId },
      orderBy: [{ tier: 'asc' }, { createdAt: 'asc' }],
    });

    // If no nodes exist yet, return empty tree with a signal to sync
    if (nodes.length === 0) {
      return NextResponse.json({
        nodes: [{
          id: 'core-junior-dev',
          name: 'Junior Dev',
          description: 'Welcome to the grind. Every legend starts here. Hit "Sync Now" on your profile to initialize your tree!',
          path: 'Core',
          tier: 0,
          position: { x: 400, y: 0 },
          requirements: { total_xp: 0 },
          xpReward: 0,
          status: 'unlocked',
          generatedBy: 'system',
        }],
        edges: [],
        currentGrind: null,
        needsSync: true,
      });
    }

    const edges = nodes
      .flatMap((node) =>
        node.parentIds.map((parentId) => ({
          id: `e-${parentId}-${node.nodeId}`,
          source: parentId,
          target: node.nodeId,
        }))
      )
      .filter((edge) => nodes.some((n) => n.nodeId === edge.source));

    const state = await prisma.skillTreeState.findUnique({ where: { userId } });

    return NextResponse.json({
      nodes: nodes.map((n) => ({
        id: n.nodeId,
        name: n.name,
        description: n.description,
        path: n.path,
        tier: n.tier,
        position: { x: n.positionX, y: n.positionY },
        requirements: n.requirements,
        xpReward: n.xpReward,
        status: n.unlocked ? 'unlocked' : 'available',
        generatedBy: n.generatedBy,
      })),
      edges,
      currentGrind: state?.currentGrind || null,
    });
  } catch (error: any) {
    console.error('SkillTree GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId, nodeId } = await req.json();

    if (!userId || !nodeId) {
      return NextResponse.json({ error: 'userId and nodeId required' }, { status: 400 });
    }

    const state = await prisma.skillTreeState.findUnique({ where: { userId } });
    const unlocked = new Set(state?.unlockedNodes || []);
    unlocked.add(nodeId);

    await prisma.skillTreeState.upsert({
      where: { userId },
      update: { unlockedNodes: Array.from(unlocked) },
      create: { userId, unlockedNodes: Array.from(unlocked) },
    });

    return NextResponse.json({ success: true, unlocked: Array.from(unlocked) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}