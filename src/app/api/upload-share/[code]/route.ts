import { NextResponse } from 'next/server';
import { getUploadShareByCode, getUploadFilesByShare, deleteUploadShare } from '@/lib/db';
import { deleteObject, listObjectsByPrefix } from '@/lib/oss';

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const share = getUploadShareByCode(code);

    if (!share) {
      return NextResponse.json({ error: '分享不存在' }, { status: 404 });
    }

    const now = new Date();
    const expiresAt = new Date(share.expires_at);
    if (now > expiresAt) {
      // Clean up expired share
      const filesToDelete = deleteUploadShare(share.id);
      for (const file of filesToDelete) {
        try {
          await deleteObject(file.oss_key);
        } catch {}
      }
      return NextResponse.json({ error: '分享已过期' }, { status: 404 });
    }

    const files = getUploadFilesByShare(share.id);

    return NextResponse.json({
      share: {
        id: share.id,
        share_code: share.share_code,
        name: share.name,
        expires_at: share.expires_at,
      },
      files: files.filter((f: any) => !f.saved),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}