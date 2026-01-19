import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { BookmarksPage } from '@/components/bookmarks/BookmarksPage';

export const metadata: Metadata = {
	title: 'Saved Grants - AI GrantMatch',
	description: 'Manage your saved grant opportunities',
};

export default async function BookmarksRoute() {
	const session = await getServerSession();

	if (!session?.user) {
		redirect('/login');
	}

	return (
		<div className="container mx-auto p-6">
			<BookmarksPage />
		</div>
	);
}
