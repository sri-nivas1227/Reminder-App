import { defineMiddleware } from 'astro:middleware';
import { auth } from './lib/auth';

const PUBLIC_ROUTES = new Set(['/login', '/signup']);
const PUBLIC_PREFIXES = ['/api/auth/', '/_astro/', '/_image', '/favicon'];

function isPublic(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  const session = await auth.api.getSession({ headers: context.request.headers });

  context.locals.session = session?.session ?? null;
  context.locals.user = session?.user ?? null;

  if (isPublic(pathname)) {
    if (session && (pathname === '/login' || pathname === '/signup')) {
      return context.redirect('/');
    }
    return next();
  }

  if (!session) {
    const redirectTo = encodeURIComponent(pathname + context.url.search);
    return context.redirect(`/login?next=${redirectTo}`);
  }

  return next();
});
