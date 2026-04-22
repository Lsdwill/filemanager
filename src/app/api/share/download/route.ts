import { NextResponse } from 'next/server';
import { getShareInfo, getShareDownloadUrl } from '@/lib/share';
import { getFileById } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { share_code, password } = await request.json();

    const share = getShareInfo(share_code);
    if (!share) {
      return NextResponse.json({ error: '分享不存在或已过期' }, { status: 404 });
    }

    if (share.is_password_protected && share.password !== password) {
      return NextResponse.json({ error: '密码错误' }, { status: 403 });
    }

    const file = getFileById(share.file_id);
    if (!file) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    const downloadUrl = await getShareDownloadUrl(file.oss_key);

    return NextResponse.json({
      download_url: downloadUrl,
      filename: file.filename,
      size: file.size,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}