export const runtime = "nodejs";

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";

const handler = NextAuth({
  session: {
    strategy: "jwt",
  },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { workspace: true }, // IMPORTANT
        });

        if (!user) return null;

        const valid = await compare(credentials.password, user.password);
        if (!valid) return null;

        // Returned user fields become JWT token fields
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          workspaceId: user.workspace?.id ?? null,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.workspaceId = user.workspaceId;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.workspaceId = token.workspaceId;
      }
      return session;
    },
  },

  // IMPORTANT → your custom login page
  pages: {
    signIn: "/auth/login",
  },
});

export { handler as GET, handler as POST };
