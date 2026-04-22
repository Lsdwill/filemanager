import { NextResponse } from 'next/server';
import { generateThumbnailUrl } from '@/lib/oss';
import { getFileByOssKey } from '@/lib/db';

function isImageType(type: string) {
  const t = type.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(t);
}

export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await params;
    const ossKey = key;

    const file = getFileByOssKey(ossKey);
    if (!file) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    if (!isImageType(file.type)) {
      return NextResponse.json({ error: '不支持缩略图' }, { status: 400 });
    }

    const thumbnailUrl = await generateThumbnailUrl(ossKey);

    return NextResponse.json({ thumbnail_url: thumbnailUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}