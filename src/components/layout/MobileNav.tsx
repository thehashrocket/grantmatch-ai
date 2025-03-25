'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileNavProps {
  user?: {
    name?: string | null
    email?: string | null
  } | null
}

export function MobileNav({ user }: MobileNavProps) {
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[240px] sm:w-[300px]">
        <nav className="flex flex-col space-y-4">
          <Link
            href="/"
            className={cn(
              'text-sm font-medium transition-colors hover:text-primary',
              pathname === '/' ? 'text-primary' : 'text-muted-foreground'
            )}
            onClick={() => setOpen(false)}
          >
            Home
          </Link>
          <Link
            href="/about"
            className={cn(
              'text-sm font-medium transition-colors hover:text-primary',
              pathname === '/about' ? 'text-primary' : 'text-muted-foreground'
            )}
            onClick={() => setOpen(false)}
          >
            About
          </Link>
          {!user ? (
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              onClick={() => setOpen(false)}
            >
              Login
            </Link>
          ) : (
            <>
              <Link
                href="/profile"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                onClick={() => setOpen(false)}
              >
                Profile
              </Link>
              <button
                onClick={() => {
                  setOpen(false)
                  signOut({ callbackUrl: '/' })
                }}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary text-left"
              >
                Log out
              </button>
            </>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  )
} 