import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "./lib/auth.config";
import { isSystemHost, normalizeRequestHost } from "./lib/partner-portal-domains";

const { auth } = NextAuth(authConfig);

function getRequestOrigin(request: NextRequest) {
  const protocol = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(/:$/, '') || 'http';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host;
  return `${protocol}://${host}`;
}

async function resolvePortalIdForHost(request: NextRequest, host: string) {
  const resolveUrl = new URL('/api/partner-portals/resolve-domain', getRequestOrigin(request));
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
    || pathname.startsWith('/portal-site')
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

  if (!request.auth?.user && pathname === '/') {
    const rewriteUrl = new URL(`/portal-site/${portalId}`, getRequestOrigin(request));
    return NextResponse.rewrite(rewriteUrl);
  }

  if (!request.auth?.user) {
    const signInUrl = new URL('/auth/simple-login', getRequestOrigin(request));
    signInUrl.searchParams.set('portalId', portalId);
    signInUrl.searchParams.set('callbackUrl', `${pathname}${search}`);
    return NextResponse.redirect(signInUrl);
  }

  const rewriteUrl = new URL(
    pathname === '/' ? `/portal/${portalId}` : `/portal/${portalId}${pathname}`,
    getRequestOrigin(request),
  );
  return NextResponse.rewrite(rewriteUrl);
});

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|.*\\..*).*)',
    '/api/protected/:path*',
  ],
};