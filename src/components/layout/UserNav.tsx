'use client';

import Link from 'next/link';
import Image from 'next/image';
import { signOut } from 'next-auth/react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, LogIn, LogOut, UserCircle } from 'lucide-react';
import { useSession } from 'next-auth/react';

export function UserNav() {
	const { data: session } = useSession();
	if (!session) {
		return (
			<Button asChild variant="ghost" size="sm" className="gap-2">
				<Link href="/login">
					<LogIn className="h-4 w-4" />
					<span>Login</span>
				</Link>
			</Button>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="relative h-8 w-8 rounded-full">
					<Avatar className="h-8 w-8">
						{session?.user?.image ? (
							<Image
								src={session.user.image}
								alt={session.user.name || 'User avatar'}
								width={32}
								height={32}
								className="h-8 w-8 rounded-full object-cover"
							/>
						) : (
							<AvatarFallback>
								<User className="h-4 w-4" />
							</AvatarFallback>
						)}
					</Avatar>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56" align="end" forceMount>
				<div className="flex items-center justify-start gap-2 p-2">
					<div className="flex flex-col space-y-1">
						{session?.user?.name && (
							<p className="text-sm font-medium leading-none">
								{session?.user?.name}
							</p>
						)}
						{session?.user?.email && (
							<p className="text-xs leading-none text-muted-foreground">
								{session?.user?.email}
							</p>
						)}
					</div>
				</div>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link href="/profile" className="flex items-center gap-2">
						<UserCircle className="h-4 w-4" />
						<span>Profile</span>
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem
					className="flex items-center gap-2"
					onSelect={(event) => {
						event.preventDefault();
						signOut({ callbackUrl: '/' });
					}}
				>
					<LogOut className="h-4 w-4" />
					<span>Log out</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
