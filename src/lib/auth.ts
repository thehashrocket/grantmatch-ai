import { PrismaAdapter } from "@auth/prisma-adapter"
import { NextAuthOptions } from "next-auth"
import { db } from "./db"
import GoogleProvider from "next-auth/providers/google"
import { Prisma } from "@prisma/client"

type UserWithRole = Prisma.UserGetPayload<{
  select: {
    id: true
    role: true
    organizationId: true
  }
}>

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: UserWithRole["role"]
      organizationId: string | null
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserWithRole["role"]
    organizationId?: string | null
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!
        session.user.role = token.role as UserWithRole["role"]
        session.user.organizationId = token.organizationId ?? null
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: {
            role: true,
            organizationId: true
          }
        })
        if (dbUser) {
          token.role = dbUser.role
          token.organizationId = dbUser.organizationId
        }
      }
      return token
    },
    async signIn({ user }) {
      return true // Allow all sign-ins for now
    },
    async redirect({ url, baseUrl }) {
      // Handle role-based redirects after sign-in
      if (url.startsWith(baseUrl)) {
        // Get user ID from the URL or token
        const userId = new URL(url).searchParams.get("userId")
        
        if (!userId) return baseUrl

        const dbUser = await db.user.findUnique({
          where: { id: userId },
          select: { role: true, organizationId: true }
        })

        if (dbUser?.role === "ADMIN") {
          return `${baseUrl}/admin`
        }

        if (dbUser?.role === "USER" && !dbUser?.organizationId) {
          return `${baseUrl}/org/new`
        }

        return `${baseUrl}/dashboard`
      }
      return baseUrl
    }
  }
} 