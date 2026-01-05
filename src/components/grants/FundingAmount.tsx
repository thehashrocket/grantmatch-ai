import { cn } from '@/lib/utils';
import {
	getFundingAmountInfo,
	type FundingAmountInput,
} from '@/lib/utils/funding-amount';

type FundingAmountProps = FundingAmountInput & {
	className?: string;
};

export function FundingAmount({
	estimatedTotalFunding,
	awardFloor,
	awardCeiling,
	fundingAmount,
	fundingVaries,
	className,
}: FundingAmountProps) {
	const { display, status } = getFundingAmountInfo({
		estimatedTotalFunding,
		awardFloor,
		awardCeiling,
		fundingAmount,
		fundingVaries,
	});

	const textMuted = status === 'MISSING';

	return (
		<span
			className={cn(
				'font-semibold',
				textMuted && 'text-muted-foreground',
				className,
			)}
		>
			{display}
		</span>
	);
}
