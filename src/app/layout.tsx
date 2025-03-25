import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { TRPCProvider } from "@/lib/trpc/Provider";
import { Toaster } from "sonner";
import "./globals.css";
import { NextAuthProvider } from '@/components/providers/next-auth-provider'
import { ErrorBoundary } from "@/components/error-boundary";
import { Header } from "@/components/layout/Header";
import { getServerSession } from "next-auth";

export const metadata: Metadata = {
  title: "GrantMatch.AI",
  description: "Find the perfect grants for your non-profit organization",
  metadataBase: new URL('https://grantmatch.ai'),
  keywords: ['grants', 'nonprofits', 'funding', 'AI', 'grant matching'],
  authors: [{ name: 'GrantMatch.AI' }],
  openGraph: {
    type: 'website',
    title: 'GrantMatch.AI - Empowering Nonprofits',
    description: 'Find and secure the funding you need to make a lasting impact in your community',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession();

  return (
    <html lang="en" className="antialiased">
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-950 dark:to-gray-900/50 min-h-screen`}>
        <NextAuthProvider>
          <TRPCProvider>
            <ErrorBoundary>
              <div className="relative min-h-screen flex flex-col">
                {/* Background decoration */}
                <div className="fixed inset-0 -z-10 overflow-hidden">
                  <div className="absolute -left-1/4 -top-1/4 h-[800px] w-[800px] rounded-full bg-blue-500/5 blur-3xl animate-pulse-slow" />
                  <div className="absolute -right-1/4 top-1/4 h-[600px] w-[600px] rounded-full bg-emerald-500/5 blur-3xl animate-pulse-slower" />
                  <div className="absolute -left-1/4 bottom-1/4 h-[600px] w-[600px] rounded-full bg-purple-500/5 blur-3xl animate-pulse-slowest" />
                </div>

                {/* Main content */}
                <Header user={session?.user} />
                <main className="flex-grow w-full">
                  {children}
                </main>

                {/* Enhanced footer */}
                <footer className="mt-auto border-t border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-950/50 backdrop-blur-sm">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="py-8 text-center">
                      <div className="space-y-4">
                        <div className="flex items-center justify-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
                          <a href="/about" className="hover:text-primary transition-colors">About</a>
                          <a href="/privacy" className="hover:text-primary transition-colors">Privacy</a>
                          <a href="/terms" className="hover:text-primary transition-colors">Terms</a>
                          <a href="/contact" className="hover:text-primary transition-colors">Contact</a>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-500">
                          © {new Date().getFullYear()} GrantMatch.AI - Empowering Non-Profits
                        </p>
                      </div>
                    </div>
                  </div>
                </footer>
              </div>
            </ErrorBoundary>
          </TRPCProvider>
          <Toaster position="top-center" />
        </NextAuthProvider>
      </body>
    </html>
  );
}
