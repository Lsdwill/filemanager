import { NextResponse } from 'next/server';
import { deleteUploadShare } from '@/lib/db';
import { deleteObject } from '@/lib/oss';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const filesToDelete = deleteUploadShare(id);

    // Delete all files from OSS
    for (const file of filesToDelete) {
      try {
        await deleteObject(file.oss_key);
      } catch {}
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}