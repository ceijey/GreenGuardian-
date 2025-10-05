import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // For now, let's disable the middleware authentication check
  // since Firebase auth state is handled client-side by AuthContext
  // This allows the dashboard to load and AuthContext will handle redirects
  
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