'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

const EXCLUDED_PATH_PREFIXES = ['/login', '/register', '/onboarding'];

export function ProfileSetupToast() {
	const { data: session, status } = useSession();
	const pathname = usePathname();
	const router = useRouter();
	const lastUserIdRef = useRef<string | null>(null);

	useEffect(() => {
		if (status !== 'authenticated') return;
		if (!session?.user) return;
		if (session.user.role === 'ADMIN') return;
		if (session.user.organizationId) return;
		if (
			EXCLUDED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
		) {
			return;
		}

		const userId = session.user.id;
		if (lastUserIdRef.current === userId) return;
		lastUserIdRef.current = userId;

		toast('Finish setting up your profile to unlock matching grants.', {
			action: {
				label: 'Complete setup',
				onClick: () => router.push('/onboarding'),
			},
			duration: 10000,
		});
	}, [pathname, router, session, status]);

	return null;
}
