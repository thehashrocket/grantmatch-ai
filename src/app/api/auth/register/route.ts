import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import * as z from 'zod'
import { db } from '@/lib/db'
import { sendVerificationEmail } from '@/lib/mail'

const registerSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
})

export async function POST(req: Request) {
  try {
    console.log('Starting registration process...')
    const json = await req.json()
    const body = registerSchema.parse(json)

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email: body.email }
    })

    if (existingUser) {
      console.log('User already exists:', body.email)
      return NextResponse.json(
        { message: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Hash the password
    const hashedPassword = await hash(body.password, 10)

    console.log('Creating new user:', body.email)
    // Create the user
    const user = await db.user.create({
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        password: hashedPassword,
      },
    })

    console.log('Creating verification token...')
    // Create verification token
    const verificationToken = await db.verificationToken.create({
      data: {
        identifier: body.email,
        token: crypto.randomUUID(),
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    })

    console.log('Sending verification email...')
    // Send verification email
    try {
      await sendVerificationEmail(body.email, verificationToken.token)
      console.log('Verification email sent successfully')
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError)
      // Delete the created user and token if email fails
      await db.$transaction([
        db.verificationToken.delete({ where: { token: verificationToken.token } }),
        db.user.delete({ where: { id: user.id } })
      ])
      throw emailError
    }

    return NextResponse.json(
      { message: 'User created successfully. Please check your email to verify your account.' },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.issues)
      return NextResponse.json(
        { message: 'Invalid registration data', errors: error.issues },
        { status: 422 }
      )
    }

    console.error('Registration error:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message)
      console.error('Error stack:', error.stack)
    }
    return NextResponse.json(
      { message: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
} 