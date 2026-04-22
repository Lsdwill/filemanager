import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = new URL(request.url);

  // Allow share pages without auth
  if (pathname.startsWith('/share/') && pathname !== '/share') {
    return NextResponse.next();
  }

  // Allow login page and auth API
  if (pathname === '/login' || pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Allow share API for public access
  if (pathname.startsWith('/api/share/') && !pathname.startsWith('/api/share/create')) {
    return NextResponse.next();
  }

  // Allow static assets
  if (pathname.startsWith('/_next/')) {
    return NextResponse.next();
  }

  // For page routes (/files, /share), just let them through —
  // the client-side AuthProvider handles redirect to /login if no token.
  // For API routes, check Authorization header.
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Check auth for API routes only
  const token = request.headers.get('Authorization')?.replace('Bearer ', '') ||
    request.cookies.get('token')?.value;

  if (!token) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/files/:path*', '/share', '/api/files/:path*', '/api/folders', '/api/share/create', '/api/share/list', '/api/share/manage/:path*'],
};