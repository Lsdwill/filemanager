import { NextResponse } from 'next/server';
import { uploadFile, deleteObject, listObjects } from '@/lib/oss';
import { insertFolder, getFolderByPath, getFolderById, deleteFolder, deleteFileByOssKey, getFolders, getFiles } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  return NextResponse.json({ folders: getFolders() });
}

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

    const folder = getFolderById(id);
    if (!folder) {
      return NextResponse.json({ error: '文件夹不存在' }, { status: 404 });
    }

    // Check if folder contains any files (including sub-folders)
    const allFiles = getFiles();
    const filesInFolder = allFiles.filter((f: any) => f.folder === folder.path || f.folder.startsWith(folder.path + '/'));
    if (filesInFolder.length > 0) {
      return NextResponse.json({ error: `文件夹内有 ${filesInFolder.length} 个文件，请先清空文件再删除` }, { status: 400 });
    }

    // Delete the .keep placeholder from OSS
    await deleteObject(`${folder.path}/.keep`);

    deleteFolder(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}