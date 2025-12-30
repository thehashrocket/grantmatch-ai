'use client';

import { useEffect, useRef } from 'react';
import type { GrantMatch } from '@/lib/types/grant';

interface GrantDetailsKickProps {
	grantId: string;
	detailsStatus?: GrantMatch['detailsStatus'];
}

export default function GrantDetailsKick({
	grantId,
	detailsStatus,
}: GrantDetailsKickProps) {
	const hasKickedRef = useRef(false);

	useEffect(() => {
		if (detailsStatus === 'AVAILABLE' || hasKickedRef.current) return;
		hasKickedRef.current = true;

		const controller = new AbortController();

		fetch(`/api/grants/${grantId}/details`, {
			signal: controller.signal,
		}).catch(() => {});

		return () => controller.abort();
	}, [grantId, detailsStatus]);

	return null;
}
