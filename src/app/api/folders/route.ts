import { NextResponse } from 'next/server';
import { uploadFile, deleteObject, listObjects } from '@/lib/oss';
import { insertFolder, getFolderByPath, deleteFolder, deleteFileByOssKey } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const { name, parent } = await request.json();

    if (!name) {
      return NextResponse.json({ error: '文件夹名称不能为空' }, { status: 400 });
    }

    const folderPath = parent ? `${parent}/${name}` : name;

    // Check if folder already exists
    const existing = getFolderByPath(folderPath);
    if (existing) {
      return NextResponse.json({ error: '文件夹已存在' }, { status: 400 });
    }

    // Create a placeholder object in OSS to represent the folder
    await uploadFile(`${folderPath}/.keep`, Buffer.from(''));

    const id = uuidv4();
    insertFolder({
      id,
      name,
      path: folderPath,
      parent: parent || '',
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ id, name, path: folderPath, parent: parent || '' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    deleteFolder(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}