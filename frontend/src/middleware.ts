import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check for the authentication token cookie
  const token = request.cookies.get('tb_jwt')?.value;
  
  const path = request.nextUrl.pathname;
  
  // Define paths that don't require authentication
  const isPublicPath = path.startsWith('/signin') || 
                       path.startsWith('/signup') ||
                       path.startsWith('/oauth');

  // If the user doesn't have a token and the path is NOT public, redirect to signin
  if (!token && !isPublicPath) {
    return NextResponse.redirect(new URL('/signin', request.url));
  }

  // If the user already has a token and is trying to access the signin/signup page, redirect to home
  if (token && isPublicPath) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Otherwise, allow the request to proceed
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - static assets
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg).*)',
  ],
};
