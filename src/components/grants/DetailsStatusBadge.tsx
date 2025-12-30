import type { GrantMatch } from '@/lib/types/grant';

type DetailsStatus = NonNullable<GrantMatch['detailsStatus']>;

const STATUS_COPY: Record<
	DetailsStatus | 'UNKNOWN',
	{ label: string; className: string }
> = {
	AVAILABLE: {
		label: 'Details ready',
		className:
			'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-50 dark:border-emerald-800',
	},
	FETCHING: {
		label: 'Fetching details…',
		className:
			'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-100 dark:border-blue-800',
	},
	FAILED: {
		label: 'Details failed',
		className:
			'bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/40 dark:text-red-100 dark:border-red-800',
	},
	UNKNOWN: {
		label: 'Details not loaded',
		className:
			'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-900/40 dark:text-slate-200 dark:border-slate-800',
	},
};

interface DetailsStatusBadgeProps {
	status?: DetailsStatus;
}

export default function DetailsStatusBadge({
	status,
}: DetailsStatusBadgeProps) {
	const { label, className } = STATUS_COPY[status ?? 'UNKNOWN'];
	const title = status === 'FAILED' ? 'Try again later.' : undefined;

	return (
		<span
			className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
			title={title}
		>
			{label}
		</span>
	);
}
