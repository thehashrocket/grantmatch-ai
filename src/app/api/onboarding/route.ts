import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { createId } from '@paralleldrive/cuid2';

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    const teamEmailsArray = teamEmails ? JSON.parse(teamEmails) as string[] : [];

    // Handle avatar upload if provided
    let avatarUrl: string | undefined;
    if (avatar) {
      // TODO: Implement file upload to your preferred storage service
      // For now, we'll skip this part
    }

    // Create or update organization
    const organization = await db.organization.create({
      data: {
        id: createId(),
        name: companyName,
        description,
        mission: 'Not specified', // Using the default value
        focusAreas: [], // Empty array for now
        address1,
        address2: address2 || undefined,
        city,
        state,
        zipCode,
      },
    });

    // Update user
    await db.user.update({
      where: { id: session.user.id },
      data: {
        firstName,
        lastName,
        phone,
        image: avatarUrl,
        organizationId: organization.id,
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
          })
        )
      );
    }

    return NextResponse.json(
      { 
        message: 'Onboarding completed successfully',
        organizationId: organization.id 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
} 