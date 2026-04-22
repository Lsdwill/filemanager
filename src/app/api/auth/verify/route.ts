import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function POST(request: Request) {
  const { token } = await request.json();

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Token 无效或已过期' }, { status: 401 });
  }

  return NextResponse.json({ valid: true });
}