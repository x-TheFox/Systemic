import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate SVG
    const isSvg = file.type === 'image/svg+xml' || file.name.endsWith('.svg');
    if (!isSvg) {
      return NextResponse.json({ error: 'Only SVG files are allowed' }, { status: 400 });
    }

    // Optional: read first chunk to verify <svg tag
    const firstBytes = await file.slice(0, 4096).text();
    if (!firstBytes.match(/<svg[\s>]/i)) {
      return NextResponse.json({ error: 'Invalid SVG file' }, { status: 400 });
    }

    // Upload to Vercel Blob
    const blob = await put(`guild-icons/${Date.now()}-${file.name}`, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error: any) {
    console.error('[Upload] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
