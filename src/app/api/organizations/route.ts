import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { createAPIError, handleAPIError, API_ERROR_CODES } from '@/lib/errors'

const organizationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  mission: z.string().min(10, 'Mission must be at least 10 characters'),
  focusAreas: z.array(z.string()),
  location: z.string().min(2, 'Location must be at least 2 characters'),
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      throw createAPIError(401, 'You must be logged in', API_ERROR_CODES.UNAUTHORIZED)
    }

    if (session.user.role !== 'USER') {
      throw createAPIError(403, 'Only users can create organizations', API_ERROR_CODES.FORBIDDEN)
    }

    const json = await req.json()
    
    try {
      const body = organizationSchema.parse(json)
      
      const organization = await db.organization.create({
        data: {
          ...body,
          users: {
            connect: {
              id: session.user.id
            }
          }
        },
      })

      // Update the user's organizationId
      await db.user.update({
        where: { id: session.user.id },
        data: { organizationId: organization.id }
      })

      return NextResponse.json(organization)
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw createAPIError(
          422,
          'Invalid organization data',
          API_ERROR_CODES.VALIDATION_ERROR
        )
      }
      throw error
    }
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: error.message,
          code: error instanceof z.ZodError ? API_ERROR_CODES.VALIDATION_ERROR : undefined
        },
        { status: error instanceof z.ZodError ? 422 : 500 }
      )
    }
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
} 