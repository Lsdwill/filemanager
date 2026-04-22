import { NextResponse } from 'next/server';
import { generateSignedUrl } from '@/lib/oss';
import { getFileByOssKey } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await params;
    const ossKey = key;

    const file = getFileByOssKey(ossKey);
    if (!file) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    const downloadUrl = await generateSignedUrl(ossKey, 3600);

    return NextResponse.json({
      download_url: downloadUrl,
      filename: file.filename,
      size: file.size,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}