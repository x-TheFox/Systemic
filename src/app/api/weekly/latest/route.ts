import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const report = await prisma.weeklyReport.findFirst({
      where: { published: true },
      orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
    });

    if (!report) {
      return NextResponse.json({ report: null });
    }

    return NextResponse.json({ report });
  } catch (error: any) {
    console.error('Weekly latest GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}