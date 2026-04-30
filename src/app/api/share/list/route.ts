import { NextResponse } from 'next/server';
import { getShares } from '@/lib/db';

export async function GET() {
  try {
    const shares = await getShares();
    return NextResponse.json({ shares });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
