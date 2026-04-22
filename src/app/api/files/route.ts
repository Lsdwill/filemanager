import { NextResponse } from 'next/server';
import { listObjects } from '@/lib/oss';
import { insertFile, getFiles, getFileByOssKey, getSubFolders } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || '';

    // Sync OSS objects with local DB
    const objects = await listObjects();
    for (const obj of objects) {
      const existing = getFileByOssKey(obj.name);
      if (!existing) {
        const filename = obj.name.split('/').pop() || obj.name;
        const type = filename.split('.').pop() || '';
        // Determine folder from oss_key path
        const parts = obj.name.split('/');
        const fileFolder = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
        insertFile({
          id: uuidv4(),
          oss_key: obj.name,
          filename,
          size: obj.size || 0,
          type,
          folder: fileFolder,
        });
      }
    }

    const files = getFiles(folder);
    const subFolders = getSubFolders(folder);

    return NextResponse.json({ files, folders: subFolders, currentFolder: folder });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}