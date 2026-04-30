import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { insertUploadShare, getUploadShares } from '@/lib/db';

export async function GET() {
  try {
    const shares = await getUploadShares();
    return NextResponse.json({ shares });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, expires_hours } = await request.json();

    const id = uuidv4();
    const shareCode = uuidv4().split('-').slice(0, 2).join('');
    const expiresAt = new Date(Date.now() + (expires_hours || 168) * 3600 * 1000).toISOString();

    await insertUploadShare({
      id,
      share_code: shareCode,
      name: name || '匿名上传',
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ id, shareCode, expiresAt, name });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
