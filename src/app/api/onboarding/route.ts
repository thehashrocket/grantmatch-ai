import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { createId } from '@paralleldrive/cuid2';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.id) {
			return NextResponse.json(
				{ error: 'Unauthorized - User ID not found' },
				{ status: 401 },
			);
		}

		const formData = await req.formData();

		// Extract data from form
		const firstName = formData.get('firstName') as string;
		const lastName = formData.get('lastName') as string;
		const phone = formData.get('phone') as string;
		const avatar = formData.get('avatar') as File | null;

		const companyName = formData.get('companyName') as string;
		const address1 = formData.get('address1') as string;
		const address2 = formData.get('address2') as string | null;
		const city = formData.get('city') as string;
		const state = formData.get('state') as string;
		const zipCode = formData.get('zipCode') as string;
		const description = formData.get('description') as string;

		const teamEmails = formData.get('teamEmails') as string;
		const teamEmailsArray = teamEmails
			? (JSON.parse(teamEmails) as string[])
			: [];

		// Validate required fields
		if (
			!firstName ||
			!lastName ||
			!companyName ||
			!address1 ||
			!city ||
			!state ||
			!zipCode
		) {
			return NextResponse.json(
				{ error: 'Missing required fields' },
				{ status: 400 },
			);
		}

		// Handle avatar upload if provided
		let avatarUrl: string | undefined;
		if (avatar) {
			// TODO: Implement file upload to your preferred storage service
		}

		// Create or update organization
		const normalizedDescription = description?.trim();
		const mission =
			normalizedDescription && normalizedDescription.length > 0
				? normalizedDescription
				: 'TBD';

		const organization = await db.organization.create({
			data: {
				id: createId(),
				name: companyName,
				description:
					normalizedDescription && normalizedDescription.length > 0
						? normalizedDescription
						: null,
				focusAreas: [],
				mission,
				address1,
				address2: address2 || undefined,
				city,
				state,
				zipCode,
			},
		});

		// Update user with organization ID
		const updatedUser = await db.user.update({
			where: {
				id: session.user.id,
			},
			data: {
				firstName,
				lastName,
				phone,
				image: avatarUrl,
				organizationId: organization.id,
			},
			select: {
				id: true,
				email: true,
				firstName: true,
				lastName: true,
				organizationId: true,
				role: true,
			},
		});

		// Send invitations to team members
		if (teamEmailsArray.length > 0) {
			await Promise.all(
				teamEmailsArray.map((email) =>
					db.invitation.create({
						data: {
							id: createId(),
							email,
							organizationId: organization.id,
							status: 'PENDING',
						},
					}),
				),
			);
		}

		// Return response with updated user data
		const response = NextResponse.json(
			{
				message: 'Onboarding completed successfully',
				organizationId: organization.id,
				user: updatedUser,
			},
			{ status: 200 },
		);

		// Set a cookie to handle the transition period
		response.cookies.set('onboarding_complete', 'true', {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 60 * 5, // 5 minutes
		});

		return response;
	} catch (error) {
		console.error('Onboarding error:', error);
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: 'Failed to complete onboarding',
			},
			{ status: 500 },
		);
	}
}
