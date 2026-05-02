import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkNodeUnlock, getAvailableNodes } from '@/lib/skilltree/unlock';
import { SKILL_TREE_NODES, SKILL_TREE_EDGES } from '@/lib/skilltree/definitions';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const state = await prisma.skillTreeState.findUnique({
      where: { userId },
    });

    const unlocked = state?.unlockedNodes || [];
    const available = await getAvailableNodes(userId);

    const nodesWithStatus = SKILL_TREE_NODES.map((node) => ({
      ...node,
      status: unlocked.includes(node.id)
        ? 'unlocked'
        : available.includes(node.id)
        ? 'available'
        : 'locked',
    }));

    return NextResponse.json({
      nodes: nodesWithStatus,
      edges: SKILL_TREE_EDGES,
      currentGrind: state?.currentGrind || null,
      progress: state?.progress || {},
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId, nodeId } = await req.json();

    if (!userId || !nodeId) {
      return NextResponse.json({ error: 'userId and nodeId required' }, { status: 400 });
    }

    const check = await checkNodeUnlock(userId, nodeId);
    if (!check.unlocked) {
      return NextResponse.json({ error: 'Requirements not met', missing: check.missing }, { status: 403 });
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
