import { NextResponse } from 'next/server';
import { generateUploadUrl } from '@/lib/oss';

export async function POST(request: Request) {
  try {
    const { ossKey, contentType } = await request.json();

    if (!ossKey) {
      return NextResponse.json({ error: '缺少文件路径' }, { status: 400 });
    }

    const uploadUrl = await generateUploadUrl(ossKey, contentType);

    return NextResponse.json({ uploadUrl, ossKey });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}