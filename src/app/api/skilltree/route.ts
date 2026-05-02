import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      // Try to get from authenticated user
      const clerkUser = await currentUser();
      if (!clerkUser) {
        return NextResponse.json({ error: 'userId required' }, { status: 400 });
      }
      const dbUser = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
      if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      return getSkillTreeForUser(dbUser.id);
    }

    return getSkillTreeForUser(userId);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function getSkillTreeForUser(userId: string) {
  const nodes = await prisma.dynamicSkillNode.findMany({
    where: { userId },
    orderBy: [{ tier: 'asc' }, { createdAt: 'asc' }],
  });

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
}
