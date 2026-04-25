import { NextResponse } from 'next/server';
import { getFolderById, renameFolder, getSubFolders } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { id, newName } = await request.json();

    if (!id || !newName) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    const folder = getFolderById(id);
    if (!folder) {
      return NextResponse.json({ error: '文件夹不存在' }, { status: 404 });
    }

    // Check for name conflict in same parent
    const siblings = getSubFolders(folder.parent);
    if (siblings.some((f: any) => f.name === newName && f.id !== id)) {
      return NextResponse.json({ error: '已存在同名文件夹' }, { status: 409 });
    }

    const result = renameFolder(id, newName);

    return NextResponse.json({ success: true, newName, newPath: result?.path });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}