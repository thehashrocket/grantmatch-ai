'use client';

import { trpc } from '@/lib/trpc/client';

export default function Home() {
  const hello = trpc.hello.useQuery({ name: 'GrantMatchAI User' });

  return (
    <main className="flex min-h-screen flex-col items-center justify-start relative overflow-hidden">
      {/* Enhanced background elements */}
      <div className="absolute inset-0 -z-10">
        {/* Large gradient orbs */}
        <div className="absolute -left-40 -top-40 h-[800px] w-[800px] rounded-full bg-blue-500/10 blur-3xl animate-pulse-slow" />
        <div className="absolute -right-40 top-20 h-[600px] w-[600px] rounded-full bg-emerald-500/10 blur-3xl animate-pulse-slower" />
        <div className="absolute left-20 bottom-20 h-[700px] w-[700px] rounded-full bg-purple-500/10 blur-3xl animate-pulse-slowest" />
        
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-gray-50/50 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900/50" />
      </div>

      <div className="w-full max-w-7xl space-y-16 px-4 py-12 md:px-8 md:py-24">
        {/* Hero Section */}
        <div className="relative">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[800px] h-[200px] bg-gradient-to-r from-blue-500/20 via-emerald-500/20 to-purple-500/20 blur-3xl" />
          <div className="text-center space-y-6 relative">
            <div className="inline-block">
              <h1 className="text-5xl md:text-7xl font-bold relative">
                <span className="bg-gradient-to-r from-blue-600 via-emerald-500 to-purple-500 bg-clip-text text-transparent">
                  Empowering Nonprofits
                </span>
                <div className="absolute -top-8 -left-8 w-16 h-16 bg-blue-500/10 rounded-full blur-xl animate-float" />
                <div className="absolute -bottom-8 -right-8 w-16 h-16 bg-purple-500/10 rounded-full blur-xl animate-float-slow" />
              </h1>
            </div>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Find and secure the funding you need to make a lasting impact in your community
            </p>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-emerald-500/5 to-purple-500/5 rounded-3xl blur-3xl -z-10" />
          
          <div className="group relative transform transition-all duration-500 hover:scale-105">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 opacity-75 blur transition-all duration-500 group-hover:opacity-100" />
            <div className="relative h-full rounded-2xl border border-gray-200 bg-white/90 p-8 dark:border-gray-800 dark:bg-gray-950/90 backdrop-blur">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-16 w-16 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all duration-500" />
              <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4">Smart Matching</h3>
              <p className="text-gray-600 dark:text-gray-300">AI-powered grant recommendations tailored to your organization's mission and needs.</p>
            </div>
          </div>
          
          <div className="group relative transform transition-all duration-500 hover:scale-105">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 opacity-75 blur transition-all duration-500 group-hover:opacity-100" />
            <div className="relative h-full rounded-2xl border border-gray-200 bg-white/90 p-8 dark:border-gray-800 dark:bg-gray-950/90 backdrop-blur">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-16 w-16 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all duration-500" />
              <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mb-4">Streamlined Applications</h3>
              <p className="text-gray-600 dark:text-gray-300">Simplified grant application process with smart form filling and deadline tracking.</p>
            </div>
          </div>
          
          <div className="group relative transform transition-all duration-500 hover:scale-105">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500 to-purple-600 opacity-75 blur transition-all duration-500 group-hover:opacity-100" />
            <div className="relative h-full rounded-2xl border border-gray-200 bg-white/90 p-8 dark:border-gray-800 dark:bg-gray-950/90 backdrop-blur">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-16 w-16 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all duration-500" />
              <h3 className="text-xl font-bold text-purple-600 dark:text-purple-400 mb-4">Impact Tracking</h3>
              <p className="text-gray-600 dark:text-gray-300">Measure and showcase your organization's impact with powerful analytics tools.</p>
            </div>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="text-center relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-100 to-transparent dark:via-gray-900 -z-10" />
          {hello.isLoading ? (
            <div className="animate-pulse bg-gray-200 dark:bg-gray-800 rounded-lg h-12 w-64 mx-auto" />
          ) : (
            <p className="text-xl bg-gradient-to-r from-blue-600 via-emerald-500 to-purple-500 bg-clip-text text-transparent font-medium py-4">
              {hello.data?.greeting}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
