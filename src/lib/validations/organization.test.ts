import { describe, expect, it } from 'vitest';

import { $Enums } from '@/prisma/generated/client';
import { updateOrganizationProfileSchema } from './organization';

// These lock in the `emptyToUndefined` contract. Under Zod 4 the helper is
// `z.preprocess(...).optional()`, and the trailing `.optional()` is easy to
// mistake for redundant noise and delete — without it every wrapped key
// becomes required. The empty-string cases below fail loudly if that happens.
describe('updateOrganizationProfileSchema — emptyToUndefined fields', () => {
	const emptyStringFields = [
		'entityType',
		'budgetRange',
		'staffRange',
		'minAward',
		'maxAward',
	] as const;

	for (const field of emptyStringFields) {
		// undefined vs null is the load-bearing distinction downstream: Prisma
		// reads `undefined` as "leave this column alone" and `null` as "write
		// NULL". Clearing a form field must not null out the column.
		it(`coerces an empty string to undefined (not null) for ${field}`, () => {
			const result = updateOrganizationProfileSchema.parse({ [field]: '' });

			expect(result[field]).toBeUndefined();
			expect(result[field]).not.toBeNull();
		});

		it(`accepts ${field} being absent entirely`, () => {
			const result = updateOrganizationProfileSchema.parse({});

			expect(result[field]).toBeUndefined();
		});

		it(`preserves an explicit null for ${field}`, () => {
			const result = updateOrganizationProfileSchema.parse({ [field]: null });

			expect(result[field]).toBeNull();
		});
	}

	it('passes a valid enum value through unchanged', () => {
		const result = updateOrganizationProfileSchema.parse({
			entityType: $Enums.OrganizationEntityType.NONPROFIT_501C3,
			budgetRange: $Enums.BudgetRange.FROM_50K_TO_250K,
		});

		expect(result.entityType).toBe(
			$Enums.OrganizationEntityType.NONPROFIT_501C3,
		);
		expect(result.budgetRange).toBe($Enums.BudgetRange.FROM_50K_TO_250K);
	});

	it('rejects a non-empty string that is not a valid enum member', () => {
		const result = updateOrganizationProfileSchema.safeParse({
			entityType: 'NOT_A_REAL_ENTITY_TYPE',
		});

		expect(result.success).toBe(false);
	});

	it('passes numeric award values through unchanged', () => {
		const result = updateOrganizationProfileSchema.parse({
			minAward: 0,
			maxAward: 5000,
		});

		expect(result.minAward).toBe(0);
		expect(result.maxAward).toBe(5000);
	});

	it('rejects a negative award amount', () => {
		const result = updateOrganizationProfileSchema.safeParse({ minAward: -1 });

		expect(result.success).toBe(false);
	});
});

describe('updateOrganizationProfileSchema — award range refinement', () => {
	it('rejects minAward greater than maxAward', () => {
		const result = updateOrganizationProfileSchema.safeParse({
			minAward: 10_000,
			maxAward: 5_000,
		});

		expect(result.success).toBe(false);
		if (result.success) return;

		const issue = result.error.issues.find(
			(i) => i.message === 'MIN_AWARD_GT_MAX_AWARD',
		);
		expect(issue).toBeDefined();
		expect(issue?.path).toEqual(['minAward']);
	});

	it('accepts minAward equal to maxAward', () => {
		const result = updateOrganizationProfileSchema.safeParse({
			minAward: 5_000,
			maxAward: 5_000,
		});

		expect(result.success).toBe(true);
	});

	it('accepts minAward less than maxAward', () => {
		const result = updateOrganizationProfileSchema.safeParse({
			minAward: 1_000,
			maxAward: 5_000,
		});

		expect(result.success).toBe(true);
	});

	// The refinement guards on null/undefined explicitly, so a half-specified
	// range must not trip it.
	it('does not flag the range when only one bound is provided', () => {
		expect(
			updateOrganizationProfileSchema.safeParse({ minAward: 10_000 }).success,
		).toBe(true);
		expect(
			updateOrganizationProfileSchema.safeParse({ maxAward: 1 }).success,
		).toBe(true);
	});

	it('does not flag the range when a bound is cleared to an empty string', () => {
		const result = updateOrganizationProfileSchema.safeParse({
			minAward: 10_000,
			maxAward: '',
		});

		expect(result.success).toBe(true);
	});
});

describe('updateOrganizationProfileSchema — collection limits', () => {
	it('rejects more than five priority focus keywords', () => {
		const result = updateOrganizationProfileSchema.safeParse({
			priorityFocusKeywords: ['a', 'b', 'c', 'd', 'e', 'f'],
		});

		expect(result.success).toBe(false);
	});

	it('accepts exactly five priority focus keywords', () => {
		const result = updateOrganizationProfileSchema.safeParse({
			priorityFocusKeywords: ['a', 'b', 'c', 'd', 'e'],
		});

		expect(result.success).toBe(true);
	});

	it('rejects an invalid revenue source member', () => {
		const result = updateOrganizationProfileSchema.safeParse({
			revenueSources: ['NOT_A_REAL_SOURCE'],
		});

		expect(result.success).toBe(false);
	});
});
