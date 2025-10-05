import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token'); // You'll need to set this cookie when user logs in
  const path = request.nextUrl.pathname;

  // Check if the path requires authentication
  if (path.startsWith('/profile') || path.startsWith('/swap') || path.startsWith('/scanner') || path.startsWith('/dashboard')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Redirect authenticated users away from auth pages
  if ((path === '/login' || path === '/signup') && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/profile/:path*',
    '/swap/:path*',
    '/scanner/:path*',
    '/dashboard/:path*',
    '/login',
    '/signup'
  ]
};