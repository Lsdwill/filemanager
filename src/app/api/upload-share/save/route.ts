import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getUploadFiles, markUploadFileSaved, insertFile } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { file_id } = await request.json();

    const uploadFiles = await getUploadFiles();
    const file = uploadFiles.find((f: any) => f.id === file_id);

    if (!file) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    if (file.saved) {
      return NextResponse.json({ error: '文件已保存' }, { status: 400 });
    }

    // Create a new file record in the main files DB
    const newFileId = uuidv4();
    await insertFile({
      id: newFileId,
      oss_key: file.oss_key,
      filename: file.filename,
      size: file.size,
      type: file.type,
      folder: '',
    });

    // Mark the upload file as saved
    await markUploadFileSaved(file_id);

    return NextResponse.json({ success: true, new_file_id: newFileId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
