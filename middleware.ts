import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Admin paths to protect
const ADMIN_PATHS = ['/admin', '/api/save-content'];

// Cookie name for auth token
const AUTH_COOKIE = 'admin_auth';

// Verify password using Web Crypto API (Edge Runtime compatible)
async function verifyPassword(password: string, expectedHash: string): Promise<boolean> {
    // expectedHash format: "sha256$iterations$salt$hash"
    // For simplicity, we'll use: just the hash of password with a pepper from env
    const pepper = process.env.ADMIN_PASSWORD_PEPPER || 'default-pepper-change-me';
    const encoder = new TextEncoder();
    const data = encoder.encode(password + pepper);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return computedHash === expectedHash;
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check if path needs protection
    const needsAuth = ADMIN_PATHS.some(path => pathname.startsWith(path));

    if (!needsAuth) {
        return NextResponse.next();
    }

    // Get auth cookie
    const authCookie = request.cookies.get(AUTH_COOKIE);
    const expectedHash = process.env.ADMIN_PASSWORD_HASH;

    // If no password hash configured, allow (dev mode) but warn
    if (!expectedHash) {
        console.warn('ADMIN_PASSWORD_HASH not set - admin unprotected');
        return NextResponse.next();
    }

    // Check cookie (cookie stores the hash as proof of auth)
    if (authCookie?.value === expectedHash) {
        return NextResponse.next();
    }

    // For API routes, return 401
    if (pathname.startsWith('/api/')) {
        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // For admin page, redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
}

export const config = {
    matcher: ['/admin/:path*', '/api/save-content/:path*']
};