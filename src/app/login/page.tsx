import { Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Login - AI GrantMatch',
  description: 'Login to your AI GrantMatch account',
}

export default function LoginPage() {
  return (
    <div className="container relative flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col p-10 text-white lg:flex dark:border-r overflow-hidden">
        {/* Enhanced animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-emerald-500 to-purple-500 opacity-85" />
        
        {/* Enhanced decorative elements */}
        <div className="absolute -left-20 -top-20 h-[500px] w-[500px] rounded-full bg-white/10 blur-3xl animate-pulse-slow" />
        <div className="absolute -right-20 -bottom-20 h-[500px] w-[500px] rounded-full bg-white/10 blur-3xl animate-pulse-slower" />
        
        {/* Floating orbs */}
        <div className="absolute left-1/4 top-1/4 h-32 w-32 rounded-full bg-white/20 blur-2xl animate-float" />
        <div className="absolute right-1/4 bottom-1/3 h-40 w-40 rounded-full bg-white/20 blur-2xl animate-float-slow" />
        <div className="absolute left-1/3 bottom-1/4 h-24 w-24 rounded-full bg-white/20 blur-2xl animate-float-slower" />
        
        <div className="relative z-20 flex items-center">
          <h1 className="text-4xl font-bold tracking-tight">
            AI GrantMatch
          </h1>
        </div>
        
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-6">
            <p className="text-xl leading-relaxed">
              "AI GrantMatch has revolutionized how we find and apply for grants. It's an invaluable tool that has helped us secure funding to make a real difference in our community."
            </p>
            <footer className="text-sm">
              <p className="font-semibold">Sofia Davis</p>
              <p className="opacity-80">Executive Director - Hope Community Foundation</p>
            </footer>
          </blockquote>
        </div>
      </div>
      
      <div className="relative p-8 lg:p-12">
        {/* Simplified background with subtle gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-gray-50/50 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900/50" />
        
        {/* Subtle decorative elements */}
        <div className="absolute -top-20 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-20 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse-slower" />
        
        <div className="relative mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-3 text-center">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-emerald-500 to-purple-500 bg-clip-text text-transparent">
              Welcome back
            </h1>
            <p className="text-muted-foreground">
              Enter your email to sign in to your account and continue your mission
            </p>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/3 via-emerald-500/3 to-purple-500/3 rounded-xl blur-xl -z-10" />
            <LoginForm />
          </div>
          
          <p className="px-8 text-center text-sm text-muted-foreground">
            New to AI GrantMatch?{" "}
            <a href="/register" className="underline underline-offset-4 hover:text-primary transition-colors">
              Create an account
            </a>
          </p>
        </div>
      </div>
    </div>
  )
} 