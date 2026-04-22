import { NextResponse } from 'next/server';
import { uploadFile } from '@/lib/oss';
import { insertFile } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || '';

    if (!file) {
      return NextResponse.json({ error: '没有文件' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ossKey = folder ? `${folder}/${file.name}` : file.name;

    await uploadFile(ossKey, buffer, { mime: file.type });

    const id = uuidv4();
    const filename = file.name;
    const type = filename.split('.').pop() || '';
    const size = file.size;

    insertFile({ id, oss_key: ossKey, filename, size, type, folder });

    return NextResponse.json({ id, oss_key: ossKey, filename, size, type, folder });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}