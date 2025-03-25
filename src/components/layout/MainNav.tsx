'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Home, Info } from 'lucide-react'

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname()

  return (
    <nav
      className={cn('flex items-center space-x-4 lg:space-x-6', className)}
      {...props}
    >
      <Link
        href="/"
        className={cn(
          'text-sm font-medium transition-colors hover:text-primary inline-flex items-center space-x-1',
          pathname === '/' ? 'text-primary' : 'text-muted-foreground'
        )}
      >
        <Home className="h-4 w-4" />
        <span>Home</span>
      </Link>
      <Link
        href="/about"
        className={cn(
          'text-sm font-medium transition-colors hover:text-primary inline-flex items-center space-x-1',
          pathname === '/about' ? 'text-primary' : 'text-muted-foreground'
        )}
      >
        <Info className="h-4 w-4" />
        <span>About</span>
      </Link>
    </nav>
  )
} 