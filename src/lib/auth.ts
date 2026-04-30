import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { checkRateLimit } from "@/lib/rate-limit";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
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
      async authorize(credentials, req) {
        try {
          // Rate Limiting Logic
          let ip = "unknown";

          // Try to extract IP from request
          if (req) {
            // Check for standard Web Request object
            if (typeof req.headers?.get === "function") {
              const forwarded = req.headers.get("x-forwarded-for");
              ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
            }
            // Check for Node-like request object
            else if (req.headers && typeof req.headers === "object") {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const forwarded = (req.headers as any)["x-forwarded-for"];
              if (typeof forwarded === "string") {
                ip = forwarded.split(",")[0].trim();
              } else if (Array.isArray(forwarded) && forwarded.length > 0) {
                ip = forwarded[0].trim();
              }
            }
          }

          // If we identified an IP, check rate limit
          if (ip !== "unknown") {
            const { success } = await checkRateLimit(ip);
            if (!success) {
              console.warn(`Login rate limit exceeded for IP: ${ip}`);
              return null;
            }
          }

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

          // Normalize email to lowercase for consistent matching
          const normalizedEmail = (credentials.email as string).toLowerCase().trim();

          const user = await prisma.user.findUnique({
            where: { 
              email: normalizedEmail
            },
          });

          if (!user) {
            // Log specific reason internally for debugging, but return generic error
            console.error('Email/password login failed: User not found');
            return null;
          }

          if (!user.passwordHash) {
            // Log specific reason internally for debugging, but return generic error
            console.error('Email/password login failed: User has no password set');
            return null;
          }

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash as string
          );

          if (!isValid) {
            // Log specific reason internally for debugging, but return generic error
            console.error('Email/password login failed: Password mismatch');
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
});
