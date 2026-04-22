import { describe, expect, it } from 'vitest';

import { grantJsonLd, grantMetadata, truncateDescription } from './grants';

describe('truncateDescription', () => {
	it('returns empty string for null', () => {
		expect(truncateDescription(null)).toBe('');
	});

	it('returns empty string for undefined', () => {
		expect(truncateDescription(undefined)).toBe('');
	});

	it('returns the text unchanged when under the limit', () => {
		expect(truncateDescription('short text')).toBe('short text');
	});

	it('returns the text unchanged when exactly at the limit', () => {
		const text = 'a'.repeat(160);
		expect(truncateDescription(text)).toBe(text);
	});

	it('truncates and appends ellipsis when over the limit', () => {
		const text = 'a'.repeat(200);
		const result = truncateDescription(text);
		expect(result).toHaveLength(160);
		expect(result.endsWith('…')).toBe(true);
	});

	it('respects a custom maxLen', () => {
		const result = truncateDescription('hello world', 5);
		expect(result).toHaveLength(5);
		expect(result.endsWith('…')).toBe(true);
	});
});

const baseGrant = {
	id: 'grant-1',
	title: 'Test Grant',
	purpose: 'Help communities',
	url: 'https://example.com/grant',
	grantor: 'Test Agency',
	deadline: null,
	deadlineType: 'UNKNOWN',
	estimatedTotalFunding: null,
	awardCeiling: null,
	awardFloor: null,
	updatedAt: new Date('2026-01-01T00:00:00Z'),
	details: null,
} as Parameters<typeof grantMetadata>[0];

describe('grantMetadata', () => {
	it('uses details.description as the primary description source', () => {
		const grant = {
			...baseGrant,
			details: { description: 'Details desc', purpose: 'Details purpose' },
		} as Parameters<typeof grantMetadata>[0];
		const meta = grantMetadata(grant);
		expect(meta.description).toBe('Details desc');
	});

	it('falls back to details.purpose when description is null', () => {
		const grant = {
			...baseGrant,
			details: { description: null, purpose: 'Details purpose' },
		} as Parameters<typeof grantMetadata>[0];
		const meta = grantMetadata(grant);
		expect(meta.description).toBe('Details purpose');
	});

	it('falls back to grant.purpose when details is null', () => {
		const meta = grantMetadata(baseGrant);
		expect(meta.description).toBe('Help communities');
	});

	it('sets robots to noindex for CLOSED grants', () => {
		const grant = { ...baseGrant, deadlineType: 'CLOSED' } as Parameters<
			typeof grantMetadata
		>[0];
		const meta = grantMetadata(grant);
		expect(meta.robots).toBe('noindex');
	});

	it('sets robots to noindex for past deadline', () => {
		const grant = {
			...baseGrant,
			deadline: new Date('2020-01-01'),
		} as Parameters<typeof grantMetadata>[0];
		const meta = grantMetadata(grant);
		expect(meta.robots).toBe('noindex');
	});

	it('sets robots to index,follow for open grants', () => {
		const grant = {
			...baseGrant,
			deadline: new Date('2099-01-01'),
		} as Parameters<typeof grantMetadata>[0];
		const meta = grantMetadata(grant);
		expect(meta.robots).toBe('index, follow');
	});

	it('includes canonical URL', () => {
		const meta = grantMetadata(baseGrant);
		expect((meta.alternates as { canonical: string }).canonical).toContain(
			'grant-1',
		);
	});
});

describe('grantJsonLd', () => {
	it('includes grant name and context', () => {
		const ld = grantJsonLd(baseGrant);
		expect(ld['@type']).toBe('CreativeWork');
		expect(ld.name).toBe('Test Grant');
	});

	it('uses estimatedTotalFunding first for price', () => {
		const grant = {
			...baseGrant,
			estimatedTotalFunding: 100000,
			awardCeiling: 50000,
		} as Parameters<typeof grantJsonLd>[0];
		const ld = grantJsonLd(grant);
		const offers = ld.offers as { price: string };
		expect(offers.price).toBe('100000');
	});

	it('falls back to awardCeiling when estimatedTotalFunding is null', () => {
		const grant = {
			...baseGrant,
			awardCeiling: 75000,
		} as Parameters<typeof grantJsonLd>[0];
		const ld = grantJsonLd(grant);
		const offers = ld.offers as { price: string };
		expect(offers.price).toBe('75000');
	});

	it('falls back to awardFloor as last resort', () => {
		const grant = {
			...baseGrant,
			awardFloor: 10000,
		} as Parameters<typeof grantJsonLd>[0];
		const ld = grantJsonLd(grant);
		const offers = ld.offers as { price: string };
		expect(offers.price).toBe('10000');
	});

	it('omits offers when no funding data', () => {
		const ld = grantJsonLd(baseGrant);
		expect(ld.offers).toBeUndefined();
	});

	it('includes expires when deadline is set', () => {
		const deadline = new Date('2026-12-31T00:00:00Z');
		const grant = { ...baseGrant, deadline } as Parameters<
			typeof grantJsonLd
		>[0];
		const ld = grantJsonLd(grant);
		expect(ld.expires).toBe('2026-12-31T00:00:00.000Z');
	});

	it('includes publisher when grantor is set', () => {
		const ld = grantJsonLd(baseGrant);
		const publisher = ld.publisher as { name: string };
		expect(publisher.name).toBe('Test Agency');
	});

	it('omits publisher when grantor is null', () => {
		const grant = { ...baseGrant, grantor: null } as Parameters<
			typeof grantJsonLd
		>[0];
		const ld = grantJsonLd(grant);
		expect(ld.publisher).toBeUndefined();
	});
});
