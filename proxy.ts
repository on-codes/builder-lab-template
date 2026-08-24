import { createServerClient } from "@supabase/ssr";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, MFA_PENDING_COOKIE } from "@/lib/auth/cookies";
import { routing } from "@/i18n/routing";

const handleI18nRouting = createIntlMiddleware(routing);

// Route-group folders don't appear in the URL, so these are the real paths — see
// docs/architecture.md for why the dashboard is a real `/dashboard` segment (not a paren
// route group like (marketing)/(auth)): a route group can't share a URL with another one,
// and both the marketing home and the dashboard home would otherwise want "/".
const AUTH_ONLY_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password"];
const DASHBOARD_PREFIX = "/dashboard";
const VERIFY_MFA_PATH = "/verify-mfa";

/**
 * Strips the locale prefix so the auth checks below work the same regardless of whether the
 * current locale is the default (no prefix, e.g. "/dashboard") or not (e.g. "/es/dashboard").
 */
function withoutLocalePrefix(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1);
  }
  return pathname;
}

export async function proxy(request: NextRequest) {
  const response = handleI18nRouting(request);

  // Refresh the underlying Supabase session on every request so Server Components/Actions
  // always see a valid, un-expired Supabase user — see supabase-security skill. This is
  // deliberately NOT what the redirects below are based on: Supabase's own session exists as
  // soon as a password is verified, even mid-MFA-challenge. The cookies checked below are
  // this app's own "fully authenticated" signal — see lib/auth/session.ts and CLAUDE.md 1.1
  // (proxy.ts is a fast, optimistic check; requireUser() in each Server Action is the
  // authoritative one).
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  await supabase.auth.getUser();

  const path = withoutLocalePrefix(request.nextUrl.pathname);
  const hasFullSession = request.cookies.has(SESSION_COOKIE);
  const hasPendingMfa = request.cookies.has(MFA_PENDING_COOKIE);

  if (path === VERIFY_MFA_PATH || path.startsWith(`${VERIFY_MFA_PATH}/`)) {
    if (hasFullSession) return redirectTo(request, DASHBOARD_PREFIX);
    if (!hasPendingMfa) return redirectTo(request, "/login");
    return response;
  }

  const isDashboardRoute = path === DASHBOARD_PREFIX || path.startsWith(`${DASHBOARD_PREFIX}/`);
  if (isDashboardRoute && !hasFullSession) {
    return redirectTo(request, "/login", { next: path });
  }

  const isAuthOnlyRoute = AUTH_ONLY_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
  if (isAuthOnlyRoute && hasFullSession) {
    return redirectTo(request, DASHBOARD_PREFIX);
  }

  return response;
}

function redirectTo(request: NextRequest, pathname: string, query?: Record<string, string>) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  for (const [key, value] of Object.entries(query ?? {})) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
