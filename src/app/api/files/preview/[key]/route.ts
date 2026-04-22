import { NextResponse } from 'next/server';
import { generatePreviewUrl } from '@/lib/oss';
import { getFileByOssKey } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await params;
    const ossKey = key;

    const file = getFileByOssKey(ossKey);
    if (!file) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    const previewUrl = await generatePreviewUrl(ossKey, 3600);

    return NextResponse.json({
      preview_url: previewUrl,
      filename: file.filename,
      size: file.size,
      type: file.type,
      oss_key: file.oss_key,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}