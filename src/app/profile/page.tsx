import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { ProfileForm } from '@/components/profile/profile-form';
import { OrganizationMatchForm } from '@/components/profile/organization-match-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const metadata: Metadata = {
	title: 'Profile - AI GrantMatch',
	description: 'Manage your AI GrantMatch profile',
};

export default async function ProfilePage() {
	const session = await getServerSession();

	if (!session?.user) {
		redirect('/login');
	}

	return (
		<div className="container mx-auto p-6">
			<div className="flex flex-col gap-8">
				<div className="flex flex-col gap-2">
					<h1 className="text-3xl font-bold tracking-tight">Profile</h1>
					<p className="text-muted-foreground">
						Manage your account settings and preferences.
					</p>
				</div>
				<ProfileForm user={session.user} />
				<OrganizationMatchForm />
				<Card>
					<CardHeader>
						<CardTitle>Saved grants</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<p className="text-sm text-muted-foreground">
							Manage tags, notes, and saved views on your bookmarks page.
						</p>
						<Button asChild variant="outline">
							<Link href="/bookmarks">Manage bookmarks</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
