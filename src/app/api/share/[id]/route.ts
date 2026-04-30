import { NextResponse } from 'next/server';
import { getShareInfo } from '@/lib/share';
import { getFileById } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const share = await getShareInfo(id);

    if (!share) {
      return NextResponse.json({ error: '分享不存在或已过期' }, { status: 404 });
    }

    const file = await getFileById(share.file_id);

    if (!file) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    return NextResponse.json({
      share: {
        id: share.id,
        share_code: share.share_code,
        is_password_protected: share.is_password_protected,
        expires_at: share.expires_at,
        view_count: share.view_count,
      },
      file: {
        filename: file.filename,
        size: file.size,
        type: file.type,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
