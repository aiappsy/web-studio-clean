
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";

const handler = NextAuth({
  providers:[
    Credentials({
      name:"credentials",
      credentials:{ email:{}, password:{} },
      async authorize(credentials){
        const user = await prisma.user.findUnique({ where:{ email: credentials.email }});
        if(!user) return null;
        const valid = await compare(credentials.password,user.password);
        if(!valid) return null;
        return user;
      }
    })
  ],
  callbacks:{
    async session({ session, token }){
      if(token?.sub){
        const user = await prisma.user.findUnique({ where:{ id: token.sub }});
        session.user.id = token.sub;
        session.user.workspaceId = user.workspaceId;
      }
      return session;
    }
  }
});

export { handler as GET, handler as POST };
