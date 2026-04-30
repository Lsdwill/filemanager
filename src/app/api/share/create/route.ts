import { NextResponse } from 'next/server';
import { createShare } from '@/lib/share';

export async function POST(request: Request) {
  try {
    const { file_id, expires_hours, is_password_protected, password } = await request.json();

    const result = await createShare({
      file_id,
      is_password_protected,
      password,
      expires_hours,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
