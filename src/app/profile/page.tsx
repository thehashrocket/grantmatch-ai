import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { ProfileForm } from '@/components/profile/profile-form';
import { BookmarkedGrants } from '@/components/profile/bookmarked-grants';

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
				<section className="space-y-4">
					<div>
						<h2 className="text-2xl font-semibold tracking-tight">
							Bookmarked Grants
						</h2>
						<p className="text-muted-foreground">
							Review saved grants, update statuses, and clean up closed items.
						</p>
					</div>
					<BookmarkedGrants />
				</section>
			</div>
		</div>
	);
}
