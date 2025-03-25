'use client'

import { MainNav } from '@/components/layout/MainNav'
import { MobileNav } from '@/components/layout/MobileNav'
import { UserNav } from '@/components/layout/UserNav'
import { Sparkles } from 'lucide-react'

interface HeaderProps {
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
  } | null
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <MobileNav user={user} />
        <div className="mr-4 hidden md:flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-bold">GrantMatch</span>
        </div>
        <MainNav className="hidden md:flex" />
        <div className="flex flex-1 items-center justify-end space-x-4">
          <UserNav user={user} />
        </div>
      </div>
    </header>
  )
} 