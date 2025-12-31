import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type MockResponseBody = {
	success?: boolean;
	result?: {
		records?: Record<string, unknown>[];
		total?: number;
	};
};

const makeResponse = (body: MockResponseBody, status = 200) => ({
	ok: status >= 200 && status < 300,
	status,
	json: async () => body,
	text: async () => JSON.stringify(body),
});

describe('caCsvAdapter CKAN paging', () => {
	const fetchMock = vi.fn();
	const originalEnv = process.env.CA_CKAN_LIMIT;

	beforeEach(() => {
		vi.stubGlobal('fetch', fetchMock);
		process.env.CA_CKAN_LIMIT = '2';
		vi.resetModules();
	});

	afterEach(() => {
		fetchMock.mockReset();
		vi.unstubAllGlobals();
		process.env.CA_CKAN_LIMIT = originalEnv;
	});

	it('paginates through CKAN records and stringifies values', async () => {
		const { caCsvAdapter } = await import('./caCsvAdapter');

		fetchMock
			.mockResolvedValueOnce(
				makeResponse({
					success: true,
					result: {
						records: [{ a: 1 }, { a: 2 }],
						total: 3,
					},
				}),
			)
			.mockResolvedValueOnce(
				makeResponse({
					success: true,
					result: {
						records: [{ a: 3 }],
						total: 3,
					},
				}),
			);

		const results: Record<string, string>[] = [];
		for await (const record of caCsvAdapter.getRecords()) {
			results.push(record as Record<string, string>);
		}

		expect(results).toEqual([{ a: '1' }, { a: '2' }, { a: '3' }]);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
});
