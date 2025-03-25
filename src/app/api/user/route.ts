import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import * as z from 'zod'

const userUpdateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
})

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const json = await req.json()
    const body = userUpdateSchema.parse(json)

    // TODO: Update user in your database
    // This is where you would update the user's information in your database
    // For now, we'll just return a success response

    return NextResponse.json({ message: 'User updated successfully' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 422 })
    }

    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 