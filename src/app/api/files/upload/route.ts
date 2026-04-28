import { NextResponse } from 'next/server';
import { insertFile } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    // Support both FormData (legacy) and JSON (direct OSS upload)
    const contentType = request.headers.get('content-type') || '';

    let ossKey: string, filename: string, size: number, folder: string;

    if (contentType.includes('application/json')) {
      const body = await request.json();
      ossKey = body.ossKey;
      filename = body.filename;
      size = body.size;
      folder = body.folder || '';
    } else {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      folder = (formData.get('folder') as string) || '';

      if (!file) {
        return NextResponse.json({ error: '没有文件' }, { status: 400 });
      }

      ossKey = folder ? `${folder}/${file.name}` : file.name;
      filename = file.name;
      size = file.size;
    }

    const id = uuidv4();
    const type = filename.split('.').pop() || '';

    insertFile({ id, oss_key: ossKey, filename, size, type, folder });

    return NextResponse.json({ id, oss_key: ossKey, filename, size, type, folder });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}