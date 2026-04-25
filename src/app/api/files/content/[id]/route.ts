import { NextResponse } from 'next/server';
import { getObjectContent, uploadFile, deleteObject } from '@/lib/oss';
import { getFileById } from '@/lib/db';

const EDITABLE_TYPES = ['md', 'txt', 'markdown'];

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const file = getFileById(id);
    if (!file) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    if (!EDITABLE_TYPES.includes(file.type.toLowerCase())) {
      return NextResponse.json({ error: '该文件类型不支持在线编辑' }, { status: 400 });
    }

    const content = await getObjectContent(file.oss_key);
    return NextResponse.json({ content, filename: file.filename, type: file.type });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { content } = await request.json();

    if (typeof content !== 'string') {
      return NextResponse.json({ error: '内容必须是字符串' }, { status: 400 });
    }

    const file = getFileById(id);
    if (!file) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    if (!EDITABLE_TYPES.includes(file.type.toLowerCase())) {
      return NextResponse.json({ error: '该文件类型不支持在线编辑' }, { status: 400 });
    }

    const mime = file.type.toLowerCase() === 'md' || file.type.toLowerCase() === 'markdown'
      ? 'text/markdown' : 'text/plain';

    // Delete old file first, then upload new content
    await deleteObject(file.oss_key);
    await uploadFile(file.oss_key, content, { mime });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}