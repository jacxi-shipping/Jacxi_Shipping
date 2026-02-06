import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        loginCode: { label: "Login Code", type: "text" },
      },
      async authorize(credentials) {
        try {
          // Check if login code is provided (simple login)
          if (credentials?.loginCode) {
            const code = (credentials.loginCode as string).trim().toUpperCase();
            
            if (!code || code.length !== 8) {
              return null;
            }

            const user = await prisma.user.findFirst({
              where: { 
                loginCode: {
                  equals: code,
                  mode: 'insensitive'
                }
              },
            });

            if (!user) {
              return null;
            }

            return {
              id: user.id,
              name: user.name,
              email: user.email,
              image: user.image,
              role: user.role,
            };
          }

          // Regular email/password login
          if (!credentials?.email || !credentials.password) {
            return null;
          }

          // Normalize email to lowercase for case-insensitive matching
          const normalizedEmail = (credentials.email as string).toLowerCase().trim();

          const user = await prisma.user.findFirst({
            where: { 
              email: {
                equals: normalizedEmail,
                mode: 'insensitive'
              }
            },
          });

          if (!user) {
            console.error(`Email/password login failed: User not found for email ${normalizedEmail}`);
            return null;
          }

          if (!user.passwordHash) {
            console.error(`Email/password login failed: User ${normalizedEmail} has no password set`);
            return null;
          }

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash as string
          );

          if (!isValid) {
            console.error(`Email/password login failed: Invalid password for email ${normalizedEmail}`);
            return null;
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role,
          };
        } catch (err) {
          // Prevent unhandled exceptions from returning HTML error pages
          // Log the error for debugging and return null so NextAuth returns JSON
          // (NextAuth will handle the null as authentication failure)
          console.error("Credentials authorize error:", err);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin", // Error code passed in query string
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        if (user.id) {
          token.id = user.id;
        }
        if (user.role) {
          token.role = user.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (typeof token.id === "string") {
          session.user.id = token.id;
        }
        if (typeof token.role === "string") {
          session.user.role = token.role;
        }
      }
      return session;
    },
  },
});
