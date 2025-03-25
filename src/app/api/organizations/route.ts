import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'

const organizationSchema = z.object({
  name: z.string().min(2),
  mission: z.string().min(10),
  focusAreas: z.array(z.string()),
  location: z.string().min(2),
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    if (session.user.role !== 'USER') {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const json = await req.json()
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
      return new NextResponse(JSON.stringify(error.issues), { status: 422 })
    }

    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 