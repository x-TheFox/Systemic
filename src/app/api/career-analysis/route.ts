import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';
import { runCareerAnalysis } from '@/lib/ai/careerAgent';

export const dynamic = 'force-dynamic';

// ─── GET: Public — fetch existing career analysis ─────────────────────────────
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId query param required' },
        { status: 400 }
      );
    }

    const analysis = await prisma.careerAnalysis.findUnique({
      where: { userId },
    });

    return NextResponse.json({ analysis });
  } catch (error: any) {
    console.error('CareerAnalysis GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── POST: Auth required — trigger or continue analysis ───────────────────────
export async function POST(req: Request) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { action, answers } = body;

    if (!action || typeof action !== 'string') {
      return NextResponse.json(
        { error: 'action is required' },
        { status: 400 }
      );
    }

    const validActions = ['start', 'answer', 'regenerate'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    if (action === 'answer' && (!answers || typeof answers !== 'object')) {
      return NextResponse.json(
        { error: 'answers object is required for action "answer"' },
        { status: 400 }
      );
    }

    // ── Regenerate: wipe existing and start fresh ──────────────────────────────
    if (action === 'regenerate') {
      await prisma.careerAnalysis.deleteMany({
        where: { userId: dbUser.id },
      });

      const result = await runCareerAnalysis(dbUser.id);
      const analysis = await prisma.careerAnalysis.findUnique({
        where: { userId: dbUser.id },
      });

      if (!result.success) {
        return NextResponse.json(
          { analysis, error: result.error, partial: result.partial },
          { status: 500 }
        );
      }

      return NextResponse.json({ analysis, partial: result.partial });
    }

    // ── Start: return existing questions if waiting for answers ────────────────
    if (action === 'start') {
      const existing = await prisma.careerAnalysis.findUnique({
        where: { userId: dbUser.id },
      });

      if (existing?.status === 'questions') {
        return NextResponse.json({ analysis: existing });
      }

      const result = await runCareerAnalysis(dbUser.id);
      const analysis = await prisma.careerAnalysis.findUnique({
        where: { userId: dbUser.id },
      });

      if (!result.success) {
        return NextResponse.json(
          { analysis, error: result.error, partial: result.partial },
          { status: 500 }
        );
      }

      return NextResponse.json({ analysis, partial: result.partial });
    }

    // ── Answer: continue pipeline with user answers ────────────────────────────
    if (action === 'answer') {
      const result = await runCareerAnalysis(dbUser.id, answers);
      const analysis = await prisma.careerAnalysis.findUnique({
        where: { userId: dbUser.id },
      });

      if (!result.success) {
        return NextResponse.json(
          { analysis, error: result.error, partial: result.partial },
          { status: 500 }
        );
      }

      return NextResponse.json({ analysis, partial: result.partial });
    }

    // Unreachable — all valid actions are handled above
    return NextResponse.json({ error: 'Unhandled action' }, { status: 500 });
  } catch (error: any) {
    console.error('CareerAnalysis POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
