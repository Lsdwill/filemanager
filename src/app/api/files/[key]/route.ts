import { NextResponse } from 'next/server';
import { deleteObject } from '@/lib/oss';
import { deleteFileByOssKey } from '@/lib/db';

export async function DELETE(request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await params;
    const ossKey = key;

    await deleteObject(ossKey);
    await deleteFileByOssKey(ossKey);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
