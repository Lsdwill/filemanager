import { NextResponse } from 'next/server';
import { createToken } from '@/lib/auth';

export async function POST(request: Request) {
  const { password } = await request.json();

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: '密码错误' }, { status: 401 });
  }

  const token = await createToken();

  return NextResponse.json({ token });
}