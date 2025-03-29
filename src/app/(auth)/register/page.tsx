import { Metadata } from 'next'
import Link from 'next/link'
import { RegisterForm } from '@/components/auth/register-form'

export const metadata: Metadata = {
  title: 'Create Account - GrantMatch.AI',
  description: 'Create a new account to get started with GrantMatch.AI',
}

export default function RegisterPage() {
  return (
    <div className="relative p-8 lg:p-12">
      {/* Simplified background with subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-gray-50/50 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900/50" />
      
      {/* Subtle decorative elements */}
      <div className="absolute -top-20 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute -bottom-20 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse-slower" />
      
      <div className="relative mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-emerald-500 to-purple-500 bg-clip-text text-transparent">
            Create Account
          </h1>
          <p className="text-muted-foreground">
            Enter your information below to create your account
          </p>
        </div>

        <RegisterForm />

        <p className="px-8 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/login"
            className="underline underline-offset-4 hover:text-primary"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
} 