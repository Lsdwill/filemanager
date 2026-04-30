import { NextResponse } from 'next/server';
import { generatePermanentUrl } from '@/lib/oss';
import { getFileById } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const file = await getFileById(id);
    if (!file) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    const permanentUrl = generatePermanentUrl(file.oss_key);

    return NextResponse.json({
      permanent_url: permanentUrl,
      filename: file.filename,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
