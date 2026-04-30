import { NextResponse } from 'next/server';
import { getShareInfo } from '@/lib/share';
import { getBatchShareByCode, getFileById } from '@/lib/db';
import { getObjectContent } from '@/lib/oss';

export async function POST(request: Request) {
  try {
    const { share_code, password, file_id } = await request.json();

    // Check if this is a batch share
    const batchShare = await getBatchShareByCode(share_code);
    if (batchShare) {
      // Validate expiration
      const now = new Date();
      const expiresAt = new Date(batchShare.expires_at);
      if (now > expiresAt) {
        return NextResponse.json({ error: '分享已过期' }, { status: 404 });
      }

      // Validate password
      if (batchShare.is_password_protected && batchShare.password !== password) {
        return NextResponse.json({ error: '密码错误' }, { status: 403 });
      }

      // Validate file_id is in the batch
      if (!batchShare.file_ids.includes(file_id)) {
        return NextResponse.json({ error: '文件不在分享列表中' }, { status: 403 });
      }

      const file = await getFileById(file_id);
      if (!file) {
        return NextResponse.json({ error: '文件不存在' }, { status: 404 });
      }

      const content = await getObjectContent(file.oss_key);

      return NextResponse.json({
        content,
        filename: file.filename,
        type: file.type,
      });
    }

    // Regular share
    const share = await getShareInfo(share_code);
    if (!share) {
      return NextResponse.json({ error: '分享不存在或已过期' }, { status: 404 });
    }

    if (share.is_password_protected && share.password !== password) {
      return NextResponse.json({ error: '密码错误' }, { status: 403 });
    }

    const file = await getFileById(share.file_id);
    if (!file) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    const content = await getObjectContent(file.oss_key);

    return NextResponse.json({
      content,
      filename: file.filename,
      type: file.type,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
