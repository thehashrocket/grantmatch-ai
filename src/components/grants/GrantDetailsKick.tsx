'use client';

import { useEffect } from 'react';
import type { GrantMatch } from '@/lib/types/grant';

interface GrantDetailsKickProps {
	grantId: string;
	detailsStatus?: GrantMatch['detailsStatus'];
}

export default function GrantDetailsKick({
	grantId,
	detailsStatus,
}: GrantDetailsKickProps) {
	useEffect(() => {
		if (detailsStatus === 'AVAILABLE') return;

		const controller = new AbortController();

		fetch(`/api/grants/${grantId}/details`, {
			signal: controller.signal,
		}).catch(() => {});

		return () => controller.abort();
	}, [grantId, detailsStatus]);

	return null;
}
