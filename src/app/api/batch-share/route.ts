import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { insertBatchShare, getBatchShares } from '@/lib/db';

export async function GET() {
  try {
    const shares = getBatchShares();
    return NextResponse.json({ shares });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { file_ids, expires_hours, is_password_protected, password } = await request.json();

    if (!file_ids || file_ids.length === 0) {
      return NextResponse.json({ error: '请选择要分享的文件' }, { status: 400 });
    }

    const id = uuidv4();
    const shareCode = uuidv4().split('-').slice(0, 2).join('');
    const expiresAt = new Date(Date.now() + (expires_hours || 24) * 3600 * 1000).toISOString();

    insertBatchShare({
      id,
      share_code: shareCode,
      file_ids,
      is_password_protected: is_password_protected || false,
      password: is_password_protected ? password : null,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
      view_count: 0,
    });

    return NextResponse.json({ id, shareCode, expiresAt });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}