import { PrismaAdapter } from "@next-auth/prisma-adapter"
import type { NextAuthOptions } from "next-auth"
import { db } from "@/lib/db"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import type { Prisma } from "@/prisma/generated/client"

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
    sub?: string
  }
}

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!googleClientId || !googleClientSecret) {
  throw new Error("Missing Google OAuth environment variables");
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt"
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  pages: {
    signIn: "/login",
    signOut: "/",
    error: "/login",
    verifyRequest: "/verify-request",
    newUser: "/onboarding"
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials")
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user || !user.password) {
          throw new Error("Invalid credentials")
        }

        if (!user.emailVerified) {
          throw new Error("Please verify your email before signing in")
        }

        const isValid = await compare(credentials.password, user.password)

        if (!isValid) {
          throw new Error("Invalid credentials")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : null,
          role: user.role,
          organizationId: user.organizationId,
        }
      }
    }),
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      profile(profile) {
        // Split the name into firstName and lastName
        const [firstName = '', lastName = ''] = (profile.name ?? '').split(' ')
        return {
          id: profile.sub,
          firstName,
          lastName,
          email: profile.email,
          image: profile.picture,
          role: "USER" as const,
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as UserWithRole["role"];
        session.user.organizationId = token.organizationId as string | null;
      }
      return session;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // Initial sign in
        token.role = (user as unknown as UserWithRole).role;
        token.organizationId = (user as unknown as UserWithRole).organizationId;
      } else if (trigger === "update" && session?.user) {
        // Handle session update
        token.role = session.user.role;
        token.organizationId = session.user.organizationId;
      }
      return token;
    },
    async signIn({ user }) {
      if (user.email) {
        const dbUser = await db.user.findUnique({
          where: { email: user.email },
          select: { emailVerified: true }
        })

        // For OAuth sign-in, automatically verify email
        if (!dbUser?.emailVerified && user.email.endsWith("@gmail.com")) {
          await db.user.update({
            where: { email: user.email },
            data: { emailVerified: new Date() }
          })
        }

        return !!dbUser?.emailVerified
      }
      return true
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) return url
      return baseUrl
    }
  }
} 
