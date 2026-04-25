import { NextResponse } from 'next/server';
import { generatePreviewUrl, generateThumbnailUrl } from '@/lib/oss';
import { getFileById, getFiles } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const file = getFileById(id);
    if (!file) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    const previewUrl = await generatePreviewUrl(file.oss_key, 3600);

    // Get sibling files in the same folder for prev/next navigation and dock bar
    const siblings = getFiles(file.folder);
    const currentIndex = siblings.findIndex((f: any) => f.id === id);
    const prevId = currentIndex > 0 ? siblings[currentIndex - 1].id : null;
    const nextId = currentIndex < siblings.length - 1 ? siblings[currentIndex + 1].id : null;

    // Generate dock bar thumbnails: 5 left + current + 5 right
    const dockStart = Math.max(0, currentIndex - 5);
    const dockEnd = Math.min(siblings.length, currentIndex + 6);
    const dockSiblings = siblings.slice(dockStart, dockEnd);

    const dockItems = await Promise.all(dockSiblings.map(async (f: any) => {
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(f.type?.toLowerCase());
      let thumbnailUrl = '';
      if (isImage) {
        thumbnailUrl = await generateThumbnailUrl(f.oss_key, 120, 120, 3600);
      }
      return {
        id: f.id,
        filename: f.filename,
        type: f.type,
        thumbnail_url: thumbnailUrl,
        is_current: f.id === id,
      };
    }));

    return NextResponse.json({
      preview_url: previewUrl,
      filename: file.filename,
      size: file.size,
      type: file.type,
      oss_key: file.oss_key,
      folder: file.folder,
      prev_id: prevId,
      next_id: nextId,
      dock_items: dockItems,
      dock_current_index: currentIndex - dockStart,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}