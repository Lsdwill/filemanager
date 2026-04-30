import { NextResponse } from 'next/server';
import { getFiles } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query) {
      return NextResponse.json({ files: [] });
    }

    const allFiles = await getFiles();
    const results = allFiles.filter((f: any) =>
      f.filename.toLowerCase().includes(query.toLowerCase())
    );

    return NextResponse.json({ files: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
