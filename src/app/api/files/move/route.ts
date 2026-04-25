import { NextResponse } from 'next/server';
import { copyObject, deleteObject } from '@/lib/oss';
import { getFileById, moveFile, getFiles } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { fileId, targetFolder } = await request.json();

    if (!fileId) {
      return NextResponse.json({ error: '缺少文件ID' }, { status: 400 });
    }

    const file = getFileById(fileId);
    if (!file) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    const filename = file.filename;
    const newOssKey = targetFolder ? `${targetFolder}/${filename}` : filename;

    // Check for name conflict in target folder
    const existingFiles = getFiles(targetFolder);
    if (existingFiles.some((f: any) => f.filename === filename && f.id !== fileId)) {
      return NextResponse.json({ error: '目标文件夹中已存在同名文件' }, { status: 409 });
    }

    // Copy to new location on OSS, then delete old
    await copyObject(file.oss_key, newOssKey);
    await deleteObject(file.oss_key);

    // Update DB
    moveFile(fileId, newOssKey, targetFolder || '');

    return NextResponse.json({ success: true, newOssKey, newFolder: targetFolder || '' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}