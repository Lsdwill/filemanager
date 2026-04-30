import { NextResponse } from 'next/server';
import { getBatchShareByCode, getFileById, incrementBatchViewCount } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const share = await getBatchShareByCode(code);

    if (!share) {
      return NextResponse.json({ error: '分享不存在' }, { status: 404 });
    }

    const now = new Date();
    const expiresAt = new Date(share.expires_at);
    if (now > expiresAt) {
      return NextResponse.json({ error: '分享已过期' }, { status: 404 });
    }

    // Increment view count
    await incrementBatchViewCount(code);

    // Get file details
    const files = (await Promise.all(share.file_ids.map(async (fid) => {
      const file = await getFileById(fid);
      if (!file) return null;
      return {
        id: file.id,
        filename: file.filename,
        size: file.size,
        type: file.type,
        oss_key: file.oss_key,
      };
    }))).filter(Boolean);

    return NextResponse.json({
      share: {
        id: share.id,
        share_code: share.share_code,
        is_password_protected: share.is_password_protected,
        expires_at: share.expires_at,
        view_count: share.view_count + 1,
      },
      files,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
