import { NextResponse } from 'next/server';
import { listObjects } from '@/lib/oss';
import { insertFile, getFiles, getFileByOssKey, getSubFolders, deleteFileByOssKey } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || '';

    // Sync OSS objects with local DB
    const objects = await listObjects();
    for (const obj of objects) {
      // Skip .keep placeholder files used for folder representation
      if (obj.name.endsWith('/.keep')) continue;
      const existing = await getFileByOssKey(obj.name);
      if (!existing) {
        const filename = obj.name.split('/').pop() || obj.name;
        const type = filename.split('.').pop() || '';
        // Determine folder from oss_key path
        const parts = obj.name.split('/');
        const fileFolder = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
        await insertFile({
          id: uuidv4(),
          oss_key: obj.name,
          filename,
          size: obj.size || 0,
          type,
          folder: fileFolder,
        });
      }
    }

    // Clean up any .keep files that were previously synced into the DB
    const allFiles = await getFiles();
    for (const file of allFiles) {
      if (file.oss_key.endsWith('/.keep') || file.filename === '.keep') {
        await deleteFileByOssKey(file.oss_key);
      }
    }

    const files = await getFiles(folder);
    const subFolders = await getSubFolders(folder);

    return NextResponse.json({ files, folders: subFolders, currentFolder: folder });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
