import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import pool from "./db"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const result = await pool.query(
          'SELECT id, email, password_hash, name, image_url FROM "user" WHERE email = $1',
          [credentials.email],
        )
        const user = result.rows[0]

        if (!user) return null

        const passwordValid = await bcrypt.compare(
          credentials.password as string,
          user.password_hash,
        )
        if (!passwordValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image_url,
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.image = user.image as string | null
      }
      return token
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string
      }
      if (token?.image) {
        session.user.image = token.image as string
      }
      return session
    },
  },
})

export async function getAuthUserId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }
  return session.user.id
}
