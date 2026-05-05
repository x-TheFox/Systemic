import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';
import { runAgentTurn } from '@/lib/ai/careerAgentEngine';
import crypto from 'crypto';

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
    const { action, sessionId, answers } = body;

    if (!action || typeof action !== 'string') {
      return NextResponse.json(
        { error: 'action is required' },
        { status: 400 }
      );
    }

    const validActions = ['start', 'step', 'answer', 'cancel'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    // ── Start: create a new session and kick off the first turn ────────────────
    if (action === 'start') {
      const newSessionId = crypto.randomUUID();

      const existing = await prisma.careerAnalysis.findUnique({
        where: { userId: dbUser.id },
      });

      if (existing) {
        await prisma.careerAnalysis.update({
          where: { userId: dbUser.id },
          data: {
            sessionId: newSessionId,
            status: 'running',
            stepCount: 0,
            maxSteps: 20,
            agentState: null,
            cancelledAt: null,
            archetype: null,
            summary: null,
            paths: null,
            skillGaps: null,
            actionPlan: null,
            thinking: null,
            questions: null,
          },
        });
      } else {
        await prisma.careerAnalysis.create({
          data: {
            userId: dbUser.id,
            sessionId: newSessionId,
            status: 'running',
            stepCount: 0,
            maxSteps: 20,
          },
        });
      }

      const result = await runAgentTurn(newSessionId, dbUser.id);
      return NextResponse.json(result);
    }

    // ── Step: continue the agent for one turn ──────────────────────────────────
    if (action === 'step') {
      if (!sessionId || typeof sessionId !== 'string') {
        return NextResponse.json(
          { error: 'sessionId is required for action "step"' },
          { status: 400 }
        );
      }

      const record = await prisma.careerAnalysis.findUnique({
        where: { sessionId },
      });

      if (!record || record.userId !== dbUser.id) {
        return NextResponse.json(
          { error: 'Session not found or access denied' },
          { status: 404 }
        );
      }

      const result = await runAgentTurn(sessionId, dbUser.id);
      return NextResponse.json(result);
    }

    // ── Answer: submit user answers and continue ───────────────────────────────
    if (action === 'answer') {
      if (!sessionId || typeof sessionId !== 'string') {
        return NextResponse.json(
          { error: 'sessionId is required for action "answer"' },
          { status: 400 }
        );
      }

      if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
        return NextResponse.json(
          { error: 'answers object is required for action "answer"' },
          { status: 400 }
        );
      }

      const record = await prisma.careerAnalysis.findUnique({
        where: { sessionId },
      });

      if (!record || record.userId !== dbUser.id) {
        return NextResponse.json(
          { error: 'Session not found or access denied' },
          { status: 404 }
        );
      }

      const result = await runAgentTurn(sessionId, dbUser.id, answers);
      return NextResponse.json(result);
    }

    // ── Cancel: mark the session as cancelled ──────────────────────────────────
    if (action === 'cancel') {
      if (!sessionId || typeof sessionId !== 'string') {
        return NextResponse.json(
          { error: 'sessionId is required for action "cancel"' },
          { status: 400 }
        );
      }

      const record = await prisma.careerAnalysis.findUnique({
        where: { sessionId },
      });

      if (!record || record.userId !== dbUser.id) {
        return NextResponse.json(
          { error: 'Session not found or access denied' },
          { status: 404 }
        );
      }

      await prisma.careerAnalysis.update({
        where: { sessionId },
        data: {
          cancelledAt: new Date(),
          status: 'cancelled',
        },
      });

      return NextResponse.json({
        type: 'cancelled',
        actions: [],
        nextAction: null,
        sessionId,
        step: record.stepCount,
        maxSteps: record.maxSteps,
        status: 'cancelled',
      });
    }

    // Unreachable — all valid actions are handled above
    return NextResponse.json({ error: 'Unhandled action' }, { status: 500 });
  } catch (error: any) {
    console.error('CareerAnalysis POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
