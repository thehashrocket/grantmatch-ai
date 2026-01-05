export type FundingAmountStatus =
	| 'RANGE_PRESENT'
	| 'TOTAL_PRESENT'
	| 'MISSING'
	| 'VARIES';

export type FundingAmountInput = {
	estimatedTotalFunding?: number | null;
	awardFloor?: number | null;
	awardCeiling?: number | null;
	fundingAmount?: number | null;
	fundingVaries?: boolean;
};

const isValidAmount = (value?: number | null) =>
	value !== null && value !== undefined && value > 0;

const formatCurrency = (amount: number): string =>
	new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0,
	}).format(amount);

export const getFundingAmountInfo = (
	input: FundingAmountInput,
): { display: string; status: FundingAmountStatus } => {
	const {
		estimatedTotalFunding,
		awardFloor,
		awardCeiling,
		fundingAmount,
		fundingVaries,
	} = input;

	const primaryAmount = isValidAmount(estimatedTotalFunding)
		? (estimatedTotalFunding as number)
		: isValidAmount(fundingAmount)
			? (fundingAmount as number)
			: null;

	if (primaryAmount !== null) {
		return {
			display: formatCurrency(primaryAmount),
			status: 'TOTAL_PRESENT',
		};
	}

	const hasFloor = isValidAmount(awardFloor);
	const hasCeiling = isValidAmount(awardCeiling);

	if (hasFloor && hasCeiling) {
		return {
			display: `${formatCurrency(awardFloor as number)} - ${formatCurrency(awardCeiling as number)}`,
			status: 'RANGE_PRESENT',
		};
	}

	if (hasFloor) {
		return {
			display: `From ${formatCurrency(awardFloor as number)}`,
			status: 'RANGE_PRESENT',
		};
	}

	if (hasCeiling) {
		return {
			display: `Up to ${formatCurrency(awardCeiling as number)}`,
			status: 'RANGE_PRESENT',
		};
	}

	if (fundingVaries) {
		return { display: 'Funding varies', status: 'VARIES' };
	}

	return { display: 'Funding not listed', status: 'MISSING' };
};

export const formatFundingCurrency = formatCurrency;
