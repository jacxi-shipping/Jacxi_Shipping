import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "./lib/auth.config";
import { isSystemHost, normalizeRequestHost } from "./lib/partner-portal-domains";

const { auth } = NextAuth(authConfig);

async function resolvePortalIdForHost(request: NextRequest, host: string) {
  const resolveUrl = new URL('/api/partner-portals/resolve-domain', request.nextUrl.origin);
  resolveUrl.searchParams.set('host', host);

  const response = await fetch(resolveUrl, {
    headers: {
      'x-portal-domain-resolve': '1',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return typeof data?.portal?.id === 'string' ? data.portal.id : null;
}

function isCustomDomainCandidatePath(pathname: string) {
  return !(
    pathname.startsWith('/auth')
    || pathname.startsWith('/dashboard')
    || pathname.startsWith('/portal')
    || pathname.startsWith('/api')
  );
}

export default auth(async (request) => {
  const host = normalizeRequestHost(
    request.headers.get('x-forwarded-host')
    || request.headers.get('host')
    || request.nextUrl.host,
  );
  const { pathname, search } = request.nextUrl;

  if (!host || isSystemHost(host) || !isCustomDomainCandidatePath(pathname)) {
    return NextResponse.next();
  }

  const portalId = await resolvePortalIdForHost(request, host);
  if (!portalId) {
    return NextResponse.next();
  }

  if (!request.auth?.user) {
    const signInUrl = new URL('/auth/signin', request.nextUrl.origin);
    signInUrl.searchParams.set('callbackUrl', `${pathname}${search}`);
    return NextResponse.redirect(signInUrl);
  }

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = pathname === '/' ? `/portal/${portalId}` : `/portal/${portalId}${pathname}`;
  return NextResponse.rewrite(rewriteUrl);
});

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|.*\\..*).*)',
    '/api/protected/:path*',
  ],
};