'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, Info, BarChart, ShieldCheck } from 'lucide-react';
import { useSession } from 'next-auth/react';

export function MainNav({
	className,
	...props
}: React.HTMLAttributes<HTMLElement>) {
	const pathname = usePathname();
	const { data: session } = useSession();
	return (
		<nav
			className={cn('flex items-center space-x-4 lg:space-x-6', className)}
			{...props}
		>
			<Link
				href="/"
				className={cn(
					'text-sm font-medium transition-colors hover:text-primary inline-flex items-center space-x-1',
					pathname === '/' ? 'text-primary' : 'text-muted-foreground',
				)}
			>
				<Home className="h-4 w-4" />
				<span>Home</span>
			</Link>
			<Link
				href="/about"
				className={cn(
					'text-sm font-medium transition-colors hover:text-primary inline-flex items-center space-x-1',
					pathname === '/about' ? 'text-primary' : 'text-muted-foreground',
				)}
			>
				<Info className="h-4 w-4" />
				<span>About</span>
			</Link>
			{session && (
				<Link
					href="/dashboard"
					className={cn(
						'text-sm font-medium transition-colors hover:text-primary inline-flex items-center space-x-1',
						pathname === '/dashboard'
							? 'text-primary'
							: 'text-muted-foreground',
					)}
				>
					<BarChart className="h-4 w-4" />
					<span>Dashboard</span>
				</Link>
			)}
			{session?.user?.role === 'ADMIN' && (
				<Link
					href="/admin"
					className={cn(
						'text-sm font-medium transition-colors hover:text-primary inline-flex items-center space-x-1',
						pathname === '/admin' ? 'text-primary' : 'text-muted-foreground',
					)}
				>
					<ShieldCheck className="h-4 w-4" />
					<span>Admin</span>
				</Link>
			)}
		</nav>
	);
}
