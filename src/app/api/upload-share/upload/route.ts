import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { insertUploadFile, getUploadShareByCode } from '@/lib/db';
import { uploadFile } from '@/lib/oss';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const uploadShareId = formData.get('upload_share_id') as string;

    if (!file || !uploadShareId) {
      return NextResponse.json({ error: '缺少文件或分享ID' }, { status: 400 });
    }

    const share = await getUploadShareByCode(uploadShareId);

    if (!share) {
      return NextResponse.json({ error: '分享不存在' }, { status: 404 });
    }

    const now = new Date();
    const expiresAt = new Date(share.expires_at);
    if (now > expiresAt) {
      return NextResponse.json({ error: '分享已过期' }, { status: 400 });
    }

    const id = uuidv4();
    const filename = file.name;
    const type = filename.split('.').pop() || '';
    const ossKey = `upload-share/${share.share_code}/${id}-${filename}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadFile(ossKey, buffer);

    await insertUploadFile({
      id,
      upload_share_id: share.id,
      oss_key: ossKey,
      filename,
      size: file.size,
      type,
      created_at: new Date().toISOString(),
      saved: false,
    });

    return NextResponse.json({ success: true, id, filename });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
