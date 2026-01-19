'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
	Sheet,
	SheetContent,
	SheetTitle,
	SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';

interface MobileNavProps {
	user?: {
		name?: string | null;
		email?: string | null;
	} | null;
}

export function MobileNav({ user }: MobileNavProps) {
	const pathname = usePathname();
	const [open, setOpen] = React.useState(false);
	const { data: session } = useSession();
	const isAuthenticated = Boolean(session?.user || user);
	const isAdmin = session?.user?.role === 'ADMIN';

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button variant="ghost" className="md:hidden">
					<Menu className="h-5 w-5" />
					<span className="sr-only">Toggle menu</span>
				</Button>
			</SheetTrigger>
			<SheetContent side="left" className="w-[240px] sm:w-[300px]">
				<SheetTitle className="sr-only">Navigation menu</SheetTitle>
				<nav className="flex flex-col space-y-4">
					<Link
						href="/"
						className={cn(
							'text-sm font-medium transition-colors hover:text-primary',
							pathname === '/' ? 'text-primary' : 'text-muted-foreground',
						)}
						onClick={() => setOpen(false)}
					>
						Home
					</Link>
					<Link
						href="/about"
						className={cn(
							'text-sm font-medium transition-colors hover:text-primary',
							pathname === '/about' ? 'text-primary' : 'text-muted-foreground',
						)}
						onClick={() => setOpen(false)}
					>
						About
					</Link>
					{!isAuthenticated ? (
						<Link
							href="/login"
							className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
							onClick={() => setOpen(false)}
						>
							Login
						</Link>
					) : (
						<>
							<Link
								href="/profile"
								className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
								onClick={() => setOpen(false)}
							>
								Profile
							</Link>
							<Link
								href="/bookmarks"
								className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
								onClick={() => setOpen(false)}
							>
								Bookmarks
							</Link>
							{isAdmin && (
								<Link
									href="/admin"
									className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
									onClick={() => setOpen(false)}
								>
									Admin
								</Link>
							)}
							<button
								type="button"
								onClick={() => {
									setOpen(false);
									signOut({ callbackUrl: '/' });
								}}
								className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary text-left"
							>
								Log out
							</button>
						</>
					)}
				</nav>
			</SheetContent>
		</Sheet>
	);
}
