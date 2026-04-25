import { NextResponse } from 'next/server';
import { getFolderById, getSubFolders, moveFolder } from '@/lib/db';
import { copyAndDeletePrefix } from '@/lib/oss';

export async function POST(request: Request) {
  try {
    const { id, targetParent } = await request.json();

    if (!id) {
      return NextResponse.json({ error: '缺少文件夹ID' }, { status: 400 });
    }

    const folder = getFolderById(id);
    if (!folder) {
      return NextResponse.json({ error: '文件夹不存在' }, { status: 404 });
    }

    // Prevent moving into itself or its descendants
    if (targetParent === folder.path || targetParent.startsWith(folder.path + '/')) {
      return NextResponse.json({ error: '不能移动到自身或子文件夹中' }, { status: 400 });
    }

    // Check for name conflict in target parent
    const siblings = getSubFolders(targetParent || '');
    if (siblings.some((f: any) => f.name === folder.name && f.id !== id)) {
      return NextResponse.json({ error: '目标文件夹中已存在同名文件夹' }, { status: 409 });
    }

    const oldPath = folder.path;
    const newPath = targetParent ? `${targetParent}/${folder.name}` : folder.name;

    // Move objects on OSS
    await copyAndDeletePrefix(oldPath, newPath);

    // Update DB
    const result = moveFolder(id, targetParent || '');

    return NextResponse.json({ success: true, newPath: result?.path });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}