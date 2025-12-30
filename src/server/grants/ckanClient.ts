import { setTimeout as wait } from 'node:timers/promises';

const BASE_URL = 'https://data.ca.gov/api/3/action';

type CkanSchemaResponse = {
	success: boolean;
	result?: unknown;
};

type CkanRecordsResponse = {
	success: boolean;
	result?: {
		total?: number;
		records?: Record<string, unknown>[];
	};
};

const DEFAULT_PAGE_SIZE = 1000;
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 500;
const REQUEST_TIMEOUT_MS = 15_000;

async function fetchWithRetry(
	url: string,
	init?: RequestInit,
	attempt = 0,
): Promise<Response> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	try {
		const res = await fetch(url, { ...init, signal: controller.signal });
		if (res.ok) return res;

		const retryable = res.status >= 500 || res.status === 429;
		if (!retryable || attempt >= MAX_RETRIES) {
			return res;
		}

		let backoff = INITIAL_BACKOFF_MS * 2 ** attempt;
		if (res.status === 429) {
			const retryAfter = res.headers.get('retry-after');
			const retryMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : backoff;
			if (!Number.isNaN(retryMs) && retryMs > backoff) {
				backoff = retryMs;
			}
		}

		await wait(backoff);
		return fetchWithRetry(url, init, attempt + 1);
	} finally {
		clearTimeout(timeout);
	}
}

export async function fetchCkanSchema(resourceId: string): Promise<unknown> {
	const url = `${BASE_URL}/datastore_info?resource_id=${encodeURIComponent(resourceId)}`;
	const res = await fetchWithRetry(url);
	const json = (await safeJson<CkanSchemaResponse>(res)) ?? { success: false };
	if (!res.ok || !json.success) {
		const text = await res.text().catch(() => '');
		throw new Error(
			`Failed to fetch CKAN schema: ${res.status} ${res.statusText} ${text ? `- ${text}` : ''}`,
		);
	}
	return json.result ?? null;
}

export async function fetchCkanPage(
	resourceId: string,
	offset: number,
	limit = DEFAULT_PAGE_SIZE,
): Promise<{ records: Record<string, unknown>[]; total: number }> {
	const url = `${BASE_URL}/datastore_search?resource_id=${encodeURIComponent(resourceId)}&limit=${limit}&offset=${offset}`;
	const res = await fetchWithRetry(url);
	const json = (await safeJson<CkanRecordsResponse>(res)) ?? { success: false };

	if (!res.ok || !json.success) {
		throw new Error(
			`Failed to fetch CKAN records: ${res.status} ${res.statusText}`,
		);
	}

	const total = json.result?.total ?? 0;
	const records = json.result?.records ?? [];
	return { records, total };
}

async function safeJson<T>(res: Response): Promise<T | null> {
	try {
		return (await res.json()) as T;
	} catch {
		return null;
	}
}

export const CKAN_PAGE_SIZE = DEFAULT_PAGE_SIZE;
