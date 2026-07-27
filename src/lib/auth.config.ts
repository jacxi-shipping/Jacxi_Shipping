import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

function getPortalIdFromPath(pathname: string) {
  const match = pathname.match(/^\/portal\/([^/?#]+)/);
  return match?.[1] || null;
}

function getAuthSecret() {
  const configuredSecret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

  if (configuredSecret) {
    return configuredSecret;
  }

  // Keep local development usable when env vars are not set yet.
  if (process.env.NODE_ENV !== 'production') {
    return 'local-dev-auth-secret-change-me';
  }

  return undefined;
}

export const authConfig = {
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      const isOnPortal = nextUrl.pathname.startsWith('/portal');
      const isOnProtected = nextUrl.pathname.startsWith('/api/protected');

      if (isOnPortal) {
        if (isLoggedIn) return true;

        const portalId = getPortalIdFromPath(nextUrl.pathname);
        if (!portalId) {
          return false;
        }

        const signInUrl = new URL('/auth/simple-login', nextUrl);
        signInUrl.searchParams.set('portalId', portalId);
        signInUrl.searchParams.set('callbackUrl', `${nextUrl.pathname}${nextUrl.search}`);
        return NextResponse.redirect(signInUrl);
      }

      if (isOnDashboard || isOnProtected) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      }

      // Allow access to other routes
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        if (user.id) {
          token.id = user.id;
        }
        if (user.role) {
          token.role = user.role;
        }
      }
      // Extend token expiry on each request to keep session alive
      if (trigger === 'update') {
        token.iat = Math.floor(Date.now() / 1000);
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
  providers: [],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Update session every 24 hours
  },
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      },
    },
  },
  secret: getAuthSecret(),
} satisfies NextAuthConfig;
