import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'

export const metadata: Metadata = {
  title: 'Verify Email - AI GrantMatch',
  description: 'Verify your email address to activate your AI GrantMatch account',
}

async function verifyEmail(token: string) {
  const verificationToken = await db.verificationToken.findUnique({
    where: { token },
  })

  if (!verificationToken) {
    return { success: false, message: 'Invalid or expired verification link' }
  }

  if (verificationToken.expires < new Date()) {
    return { success: false, message: 'Verification link has expired' }
  }

  // Update user and delete verification token
  await db.$transaction([
    db.user.update({
      where: { email: verificationToken.identifier },
      data: { emailVerified: new Date() },
    }),
    db.verificationToken.delete({
      where: { token: verificationToken.token },
    }),
  ])

  return { success: true }
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { token?: string }
}) {
  const token = searchParams.token

  if (!token) {
    redirect('/')
  }

  const result = await verifyEmail(token)

  return (
    <div className="relative p-8 lg:p-12">
      {/* Simplified background with subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-gray-50/50 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900/50" />
      
      {/* Subtle decorative elements */}
      <div className="absolute -top-20 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute -bottom-20 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse-slower" />
      
      <div className="relative mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-3 text-center">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-emerald-500 to-purple-500 bg-clip-text text-transparent">
            {result.success ? 'Email Verified!' : 'Verification Failed'}
          </h1>
          <p className="text-muted-foreground">
            {result.success 
              ? 'Your email has been verified. You can now sign in to your account.'
              : result.message}
          </p>
        </div>
        
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/3 via-emerald-500/3 to-purple-500/3 rounded-xl blur-xl -z-10" />
          <a
            href="/login"
            className="block w-full py-2 text-center text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    </div>
  )
} 