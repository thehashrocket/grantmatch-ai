import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
	const token = await getToken({ req: request });
	const pathname = request.nextUrl.pathname;

	const publicPrefixes = ['/login', '/register', '/verify-email', '/api'];
	const protectedPrefixes = [
		'/dashboard',
		'/profile',
		'/org',
		'/admin',
		'/grants',
		'/onboarding',
	];
	const isPublicRoute = publicPrefixes.some((prefix) =>
		pathname.startsWith(prefix),
	);
	const isProtectedRoute = protectedPrefixes.some((prefix) =>
		pathname.startsWith(prefix),
	);

	// Allow all public routes and any routes not explicitly protected.
	if (isPublicRoute || !isProtectedRoute) {
		return NextResponse.next();
	}

	// Protect routes that require authentication.
	if (!token) {
		return NextResponse.redirect(new URL('/login', request.url));
	}

	// Check if user needs to complete onboarding
	if (
		token.role === 'USER' &&
		!token.organizationId &&
		!pathname.startsWith('/onboarding') &&
		// Allow a brief transition period after onboarding
		!request.cookies.has('onboarding_complete')
	) {
		return NextResponse.redirect(new URL('/onboarding', request.url));
	}

	// Admin routes
	if (pathname.startsWith('/admin') && token.role !== 'ADMIN') {
		return NextResponse.redirect(new URL('/', request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - public (public files)
		 */
		'/((?!_next/static|_next/image|favicon.ico|public).*)',
	],
};
