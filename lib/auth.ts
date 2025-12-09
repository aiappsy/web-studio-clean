// lib/auth.ts
export const runtime = "nodejs";

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";

// We wrap NextAuth so we can also export auth(), signIn(), signOut()
// This prevents build failures across the whole app.
const authOptions = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;

        const valid = await compare(credentials.password, user.password);
        if (!valid) return null;

        return user;
      },
    }),
  ],

  callbacks: {
    async session({ session, token }) {
      if (token?.sub) {
        session.user = {
          ...session.user,
          id: token.sub,
        };
      }
      return session;
    },
  },
};

// Create auth handlers
const { handlers, auth, signIn, signOut } = NextAuth(authOptions);

// Export for API routes
export const GET = handlers.GET;
export const POST = handlers.POST;

// Export helper functions so other modules stop crashing
export { auth, signIn, signOut };
