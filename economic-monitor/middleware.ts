import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Redirect logged in users away from login page
    if (pathname === '/login' && token) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        // Public paths
        if (pathname === '/' || pathname === '/login' || pathname.startsWith('/api/auth')) {
          return true;
        }
        // Protected paths
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ['/', '/dashboard/:path*', '/login'],
};
