import { NextResponse } from 'next/server';
import { copyObject, deleteObject } from '@/lib/oss';
import { getFileById, renameFile, getFiles } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { fileId, newName } = await request.json();

    if (!fileId || !newName) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    const file = await getFileById(fileId);
    if (!file) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    // Check for name conflict in same folder
    const existingFiles = await getFiles(file.folder);
    if (existingFiles.some((f: any) => f.filename === newName && f.id !== fileId)) {
      return NextResponse.json({ error: '已存在同名文件' }, { status: 409 });
    }

    const newOssKey = file.folder ? `${file.folder}/${newName}` : newName;

    // Copy to new name on OSS, then delete old
    await copyObject(file.oss_key, newOssKey);
    await deleteObject(file.oss_key);

    // Update DB
    await renameFile(fileId, newName, newOssKey);

    return NextResponse.json({ success: true, newFilename: newName, newOssKey });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
