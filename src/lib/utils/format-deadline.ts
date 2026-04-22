export function formatDeadline(
	deadline: Date | null,
	deadlineType: string | null,
): string {
	if (deadlineType === 'ONGOING' || deadlineType === 'ROLLING')
		return deadlineType.charAt(0) + deadlineType.slice(1).toLowerCase();
	if (!deadline) return deadlineType ?? 'Unknown';
	return deadline.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
}
