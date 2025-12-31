import { cn } from '@/lib/utils';

type FundingAmountProps = {
	estimatedTotalFunding?: number | null;
	awardFloor?: number | null;
	awardCeiling?: number | null;
	fundingAmount?: number | null;
	className?: string;
};

const isValidAmount = (value?: number | null) =>
	value !== null && value !== undefined && value > 0;

const formatCurrency = (amount: number): string =>
	new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0,
	}).format(amount);

export function FundingAmount({
	estimatedTotalFunding,
	awardFloor,
	awardCeiling,
	fundingAmount,
	className,
}: FundingAmountProps) {
	const primaryAmount = isValidAmount(estimatedTotalFunding)
		? (estimatedTotalFunding as number)
		: isValidAmount(fundingAmount)
			? (fundingAmount as number)
			: null;

	if (primaryAmount !== null) {
		return (
			<span className={cn('font-semibold', className)}>
				{formatCurrency(primaryAmount)}
			</span>
		);
	}

	const hasFloor = isValidAmount(awardFloor);
	const hasCeiling = isValidAmount(awardCeiling);

	if (hasFloor && hasCeiling) {
		return (
			<span className={cn('font-semibold', className)}>
				{formatCurrency(awardFloor as number)} -{' '}
				{formatCurrency(awardCeiling as number)}
			</span>
		);
	}

	if (hasFloor) {
		return (
			<span className={cn('font-semibold', className)}>
				From {formatCurrency(awardFloor as number)}
			</span>
		);
	}

	if (hasCeiling) {
		return (
			<span className={cn('font-semibold', className)}>
				Up to {formatCurrency(awardCeiling as number)}
			</span>
		);
	}

	return (
		<span className={cn('font-semibold text-muted-foreground', className)}>
			Funding varies
		</span>
	);
}
