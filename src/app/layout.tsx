import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { TRPCProvider } from "@/lib/trpc/Provider";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GrantMatch.AI",
  description: "Find the perfect grants for your non-profit organization",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TRPCProvider>
          <div className="min-h-screen flex flex-col">
            <header className="sticky top-0 z-50 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="h-16 flex items-center justify-between">
                  <div className="flex items-center">
                    <h1 className="text-2xl font-bold tracking-tight">
                      GrantMatch.AI
                    </h1>
                  </div>
                  {/* Navigation can be added here later */}
                  <nav className="hidden md:block">
                    {/* Future nav items */}
                  </nav>
                </div>
              </div>
            </header>

            <main className="flex-grow">
              <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
                {children}
              </div>
            </main>

            <footer className="mt-auto bg-gray-50 border-t border-gray-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="py-8 text-center text-gray-600">
                  <p className="text-sm">
                    © {new Date().getFullYear()} GrantMatch.AI - Empowering Non-Profits
                  </p>
                </div>
              </div>
            </footer>
          </div>
          <Toaster />
        </TRPCProvider>
      </body>
    </html>
  );
}
