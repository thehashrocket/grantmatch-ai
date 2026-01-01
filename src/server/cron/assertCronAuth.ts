import { NextResponse, type NextRequest } from 'next/server';

export function validateCronAuth(
	request: NextRequest,
): { authorized: true } | { authorized: false; response: NextResponse } {
	const secret = process.env.CRON_SECRET;
	if (!secret) {
		console.error('CRON_SECRET is not configured; refusing cron request');
		return {
			authorized: false,
			response: NextResponse.json(
				{ ok: false, error: 'CRON_SECRET is not configured' },
				{ status: 500 },
			),
		};
	}

	const header = request.headers.get('authorization') ?? '';
	const token = header.startsWith('Bearer ')
		? header.slice('Bearer '.length).trim()
		: null;

	if (!token || token !== secret) {
		return {
			authorized: false,
			response: NextResponse.json(
				{ ok: false, error: 'Unauthorized' },
				{ status: 401 },
			),
		};
	}

	return { authorized: true };
}
